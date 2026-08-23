/*
 * maddix bridge — tiny zero-dependency Node server
 * Endpoints:
 *   POST /ai/contact            { name?, reply?, message, lang?, page?, sid }  -> sends to admin Telegram
 *   GET  /ai/contact/:sid/replies?since=<ts>                                    -> visitor polls for admin replies
 *   GET  /healthz
 *
 * Env:
 *   TG_TOKEN        bot token from @BotFather           (required)
 *   ADMIN_USERNAME  telegram username WITHOUT @         (default: MadiM1992)
 *   ALLOWED_ORIGINS comma separated origins             (default: https://maddixmhn.github.io)
 *   PORT                                                (default: 8787)
 */
"use strict";
const http = require("http");
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8787;
const TG_TOKEN = process.env.TG_TOKEN || "";
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || "MadiM1992").replace(/^@/, "");
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "https://maddixmhn.github.io").split(",").map(s => s.trim());
const STATE_FILE = path.join(__dirname, "state.json");

/* ---------- persistence ---------- */
let state = { adminChatId: null, threads: {}, offsets: {} }; // threads[sid] = [{from,text,ts}]
try { state = Object.assign(state, JSON.parse(fs.readFileSync(STATE_FILE, "utf8"))); } catch (e) {}
let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch (e) {}
  }, 300);
}

/* ---------- telegram api ---------- */
function tg(method, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {});
    const req = https.request({
      hostname: "api.telegram.org",
      path: `/bot${TG_TOKEN}/${method}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
      timeout: 15000
    }, res => {
      let data = "";
      res.on("data", c => (data += c));
      res.on("end", () => {
        try { const j = JSON.parse(data); j.ok ? resolve(j.result) : reject(new Error(j.description)); }
        catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.write(payload);
    req.end();
  });
}

async function sendToAdmin(text) {
  if (!state.adminChatId) throw new Error("admin_not_registered");
  return tg("sendMessage", {
    chat_id: state.adminChatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true }
  });
}

/* ---------- long-poll updates ---------- */
let pollOffset = 0;
async function pollUpdates() {
  while (true) {
    try {
      const res = await tg("getUpdates", { offset: pollOffset, timeout: 25, allowed_updates: ["message"] });
      for (const u of res || []) {
        pollOffset = u.update_id + 1;
        const msg = u.message;
        if (!msg || !msg.from) continue;
        const uname = (msg.from.username || "").toLowerCase();
        // register admin automatically on first /start or any message
        if (!state.adminChatId && uname === ADMIN_USERNAME.toLowerCase()) {
          state.adminChatId = msg.chat.id;
          persist();
          await tg("sendMessage", { chat_id: msg.chat.id, text: "✅ Bridge connected. Visitor messages will arrive here.\nReply to a message (swipe-to-reply) to answer that visitor." }).catch(() => {});
          console.log("[bridge] admin registered:", msg.chat.id);
          continue;
        }
        // admin reply -> route to thread
        if (msg.chat.id === state.adminChatId && msg.reply_to_message) {
          const ref = msg.reply_to_message.text || "";
          const m = ref.match(/#([a-z0-9]{6,12})/i);
          if (m) {
            const sid = m[1].toLowerCase();
            state.threads[sid] = state.threads[sid] || [];
            state.threads[sid].push({ from: "maddix", text: String(msg.text || "").substring(0, 1000), ts: Date.now() });
            persist();
          }
        }
      }
    } catch (e) {
      console.log("[tg] poll error:", e.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}
if (TG_TOKEN) pollUpdates(); else console.log("[warn] TG_TOKEN missing - telegram disabled");

/* ---------- helpers ---------- */
const rateMap = new Map(); // ip -> timestamps[]
function limited(ip) {
  const now = Date.now();
  const arr = (rateMap.get(ip) || []).filter(t => now - t < 60_000);
  arr.push(now);
  rateMap.set(ip, arr);
  if (rateMap.size > 5000) rateMap.clear();
  return arr.length > 6; // max 6 msgs/min/ip
}
function cors(res, origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", c => { data += c; if (data.length > 20_000) { reject(new Error("too_large")); req.destroy(); } });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------- server ---------- */
http.createServer(async (req, res) => {
  cors(res, req.headers.origin || "");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, "http://x");

  if (url.pathname === "/healthz") return json(res, 200, { ok: true, admin: !!state.adminChatId });

  /* visitor sends a message */
  if (req.method === "POST" && url.pathname === "/ai/contact") {
    const ip = req.socket.remoteAddress || "?";
    if (limited(ip)) return json(res, 429, { ok: false, error: "rate_limited" });
    try {
      const body = JSON.parse(await readBody(req));
      const message = String(body.message || "").trim().substring(0, 1500);
      if (!message) return json(res, 400, { ok: false, error: "empty" });
      const sid = String(body.sid || crypto.randomBytes(5).toString("hex")).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
      const lang = body.lang === "fa" ? "fa" : "en";
      const who = esc(body.name || "Anonymous").substring(0, 80);
      const reply = esc(body.reply || "—").substring(0, 120);
      const page = esc(body.page || "").substring(0, 160);

      state.threads[sid] = state.threads[sid] || [];
      state.threads[sid].push({ from: "visitor", text: message, ts: Date.now() });
      persist();

      const header = lang === "fa"
        ? `📨 <b>پیام جدید از سایت</b>\nاز: <b>${who}</b>\nراه تماس: ${reply}\nتیکت: <b>#${sid}</b>`
        : `📨 <b>New site message</b>\nFrom: <b>${who}</b>\nReply-to: ${reply}\nTicket: <b>#${sid}</b>`;
      await sendToAdmin(`${header}\n\n${esc(message)}\n\n🔗 ${page}`);

      // greet admin once per thread
      if (!state.offsets["greet_" + sid]) {
        state.offsets["greet_" + sid] = 1;
        await tg("sendMessage", { chat_id: state.adminChatId, text: lang === "fa" ? "↩️ برای پاسخ، روی همین پیام ریپلای کن." : "↩️ Swipe-reply to THIS message to answer the visitor." }).catch(() => {});
      }
      return json(res, 200, { ok: true, sid });
    } catch (e) {
      const adminMissing = e.message === "admin_not_registered";
      return json(res, adminMissing ? 503 : 500, { ok: false, error: adminMissing ? "admin_not_registered" : "send_failed" });
    }
  }

  /* visitor polls for replies */
  if (req.method === "GET" && /^\/ai\/contact\/[a-z0-9]{4,16}\/replies$/.test(url.pathname)) {
    const sid = url.pathname.split("/")[3];
    const since = parseInt(url.searchParams.get("since") || "0", 10);
    const thread = state.threads[sid] || [];
    const replies = thread.filter(m => m.from === "maddix" && m.ts > since);
    return json(res, 200, { ok: true, replies });
  }

  json(res, 404, { ok: false });
}).listen(PORT, () => console.log(`[bridge] listening on :${PORT}`));