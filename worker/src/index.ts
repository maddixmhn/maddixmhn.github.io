import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { answerVisitor } from "./assistant";
import { createDb, type Db } from "./db";
import { HttpError, type Env } from "./env";
import { seal } from "./elon/crypto";
import { decideRun, startRun } from "./elon/harness";
import type { ChatMessage } from "./llm";
import { emitEvent, listExecutions, listWorkflows, setWorkflowActive } from "./n8n";
import { registerOrgRoutes } from "./org-routes";
import { handleUpdate, notifyAdmin } from "./telegram";
import { httpsUrl, lang, optional, sid, text, timingSafeEqual } from "./validate";

type App = { Bindings: Env; Variables: { db: Db } };
const app = new Hono<App>();

app.onError((error, c) => {
  if (error instanceof HttpError) return c.json({ ok: false, error: error.code }, error.status);
  console.error("unhandled", String(error));
  return c.json({ ok: false, error: "internal_error" }, 500);
});

app.use("*", async (c, next) => {
  c.set("db", createDb(c.env));
  await next();
});

app.use("/v1/*", (c, next) =>
  cors({
    origin: (origin) => (c.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).includes(origin) ? origin : null),
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })(c, next),
);

app.get("/health", (c) => c.json({ ok: true }));

async function body(c: Context<App>): Promise<Record<string, any>> {
  const declared = Number(c.req.header("content-length") ?? 0);
  if (declared > 32_000) throw new HttpError(400, "body_too_large");
  const raw = await c.req.text();
  if (raw.length > 32_000) throw new HttpError(400, "body_too_large");
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    /* handled below */
  }
  throw new HttpError(400, "invalid_json");
}

async function guardPublic(c: Context<App>, payload?: Record<string, any>) {
  const origin = c.req.header("origin") ?? "";
  if (!c.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).includes(origin)) throw new HttpError(403, "origin_not_allowed");
  if (payload?.website) throw new HttpError(400, "rejected");
  if (c.env.PUBLIC_LIMITER) {
    const { success } = await c.env.PUBLIC_LIMITER.limit({ key: c.req.header("cf-connecting-ip") ?? "unknown" });
    if (!success) throw new HttpError(429, "rate_limited");
  }
}

/* Public: visitor conversation */

app.post("/v1/contact", async (c) => {
  const input = await body(c);
  await guardPublic(c, input);
  const row = {
    sid: sid(input.sid),
    direction: "in",
    name: optional(input.name, "name", 120),
    reply_to: optional(input.reply, "reply", 200),
    body: text(input.message, "message", 2, 4000),
    lang: lang(input.lang),
    page: optional(input.page, "page", 300),
  };
  const db = c.get("db");
  const saved = await db.insert("messages", row);
  const delivered = await notifyAdmin(
    c.env,
    `New message${row.name ? ` from ${row.name}` : ""}\nReply via: ${row.reply_to ?? "site chat"}\nPage: ${row.page ?? "-"}\n\n${row.body}\n\nSwipe-reply to answer on the site.`,
  );
  if (delivered !== null) await db.update("messages", { id: `eq.${saved.id}` }, { tg_message_id: delivered });
  c.executionCtx.waitUntil(emitEvent(c.env, "contact.received", { id: saved.id, name: row.name, lang: row.lang }));
  return c.json({ ok: true, id: saved.id, notified: delivered !== null });
});

app.get("/v1/contact/:sid/replies", async (c) => {
  await guardPublic(c);
  const since = c.req.query("since");
  const after = since && !Number.isNaN(Date.parse(since)) ? new Date(since).toISOString() : "1970-01-01T00:00:00Z";
  const rows = await c.get("db").select("messages", {
    sid: `eq.${sid(c.req.param("sid"))}`,
    direction: "eq.out",
    created_at: `gt.${after}`,
    order: "created_at.asc",
    limit: 50,
  });
  return c.json({ ok: true, replies: rows.map((r) => ({ body: r.body, at: r.created_at })) });
});

/* Public: developers asking to join */

app.post("/v1/collab", async (c) => {
  const input = await body(c);
  await guardPublic(c, input);
  const row = {
    name: text(input.name, "name", 2, 120),
    contact: text(input.contact, "contact", 3, 200),
    github_url: input.github ? httpsUrl(input.github, "github") : null,
    skills: text(input.skills, "skills", 2, 400),
    project: text(input.project, "project", 2, 120),
    message: text(input.message, "message", 10, 3000),
    lang: lang(input.lang),
  };
  const db = c.get("db");
  const saved = await db.insert("collab_requests", row);
  const delivered = await notifyAdmin(
    c.env,
    `New collaboration request\n${row.name} (${row.contact})\nProject: ${row.project}\nSkills: ${row.skills}\nGitHub: ${row.github_url ?? "-"}\n\n${row.message}`,
  );
  if (delivered !== null) await db.update("collab_requests", { id: `eq.${saved.id}` }, { tg_message_id: delivered });
  c.executionCtx.waitUntil(emitEvent(c.env, "collab.received", { id: saved.id, project: row.project }));
  return c.json({ ok: true, id: saved.id, notified: delivered !== null });
});

/* Public: site assistant */

app.post("/v1/chat", async (c) => {
  const input = await body(c);
  await guardPublic(c, input);
  if (!Array.isArray(input.messages) || input.messages.length < 1) throw new HttpError(400, "invalid_messages");
  const history: ChatMessage[] = input.messages.slice(-8).map((m: any) => ({
    role: m?.role === "assistant" ? "assistant" : "user",
    content: text(m?.content, "message", 1, 1200),
  }));
  return c.json({ ok: true, reply: await answerVisitor(c.env, history, lang(input.lang)) });
});

/* Telegram */

app.post("/telegram/webhook", async (c) => {
  const secret = c.env.TELEGRAM_WEBHOOK_SECRET;
  const given = c.req.header("x-telegram-bot-api-secret-token") ?? "";
  if (!secret || !timingSafeEqual(secret, given)) throw new HttpError(401, "unauthorized");
  await handleUpdate(c.env, c.get("db"), await c.req.json());
  return c.json({ ok: true });
});

/* Owner */

app.use("/v1/admin/*", async (c, next) => {
  if (c.req.method === "OPTIONS") return next();
  const auth = c.req.header("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) throw new HttpError(401, "unauthorized");
  const res = await fetch(`${c.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: c.env.SUPABASE_SERVICE_KEY, Authorization: auth },
  });
  if (!res.ok) throw new HttpError(401, "unauthorized");
  const user = (await res.json()) as { email?: string };
  if (!c.env.ADMIN_EMAIL || user.email?.toLowerCase() !== c.env.ADMIN_EMAIL.toLowerCase()) throw new HttpError(403, "forbidden");
  await next();
});

app.get("/v1/admin/overview", async (c) => {
  const db = c.get("db");
  const [unread, collab, runs, pending] = await Promise.all([
    db.count("messages", { direction: "eq.in", status: "eq.new" }),
    db.count("collab_requests", { status: "eq.new" }),
    db.count("elon_runs"),
    db.count("elon_runs", { status: "eq.awaiting_approval" }),
  ]);
  return c.json({
    ok: true,
    unread,
    collab,
    elonRuns: runs,
    elonPending: pending,
    services: {
      telegram: Boolean(c.env.TELEGRAM_BOT_TOKEN && c.env.TELEGRAM_ADMIN_CHAT_ID),
      assistant: Boolean(c.env.GROQ_API_KEY || c.env.GEMINI_API_KEY),
      n8n: Boolean(c.env.N8N_BASE_URL && c.env.N8N_API_KEY),
      n8nEvents: Boolean(c.env.N8N_EVENT_WEBHOOK),
      elonVault: Boolean(c.env.ELON_MASTER_KEY),
      paperclip: Boolean(c.env.PAPERCLIP_WEBHOOK_SECRET),
    },
  });
});

app.get("/v1/admin/messages", async (c) => {
  const rows = await c.get("db").select("messages", { order: "created_at.desc", limit: 200 });
  return c.json({ ok: true, messages: rows });
});

app.patch("/v1/admin/messages/:id", async (c) => {
  const { status } = await body(c);
  if (!["new", "read", "archived"].includes(status)) throw new HttpError(400, "invalid_status");
  await c.get("db").update("messages", { id: `eq.${c.req.param("id")}` }, { status });
  return c.json({ ok: true });
});

app.post("/v1/admin/messages/:sid/reply", async (c) => {
  const input = await body(c);
  await c.get("db").insert("messages", {
    sid: sid(c.req.param("sid")),
    direction: "out",
    body: text(input.text, "text", 1, 4000),
    status: "read",
  });
  return c.json({ ok: true });
});

app.get("/v1/admin/collab", async (c) => {
  return c.json({ ok: true, requests: await c.get("db").select("collab_requests", { order: "created_at.desc", limit: 200 }) });
});

app.patch("/v1/admin/collab/:id", async (c) => {
  const { status } = await body(c);
  if (!["new", "reviewing", "accepted", "declined"].includes(status)) throw new HttpError(400, "invalid_status");
  await c.get("db").update("collab_requests", { id: `eq.${c.req.param("id")}` }, { status });
  return c.json({ ok: true });
});

app.get("/v1/admin/n8n/workflows", async (c) => c.json({ ok: true, workflows: await listWorkflows(c.env) }));
app.get("/v1/admin/n8n/executions", async (c) => c.json({ ok: true, executions: await listExecutions(c.env) }));
app.post("/v1/admin/n8n/workflows/:id/active", async (c) => {
  const input = await body(c);
  return c.json({ ok: true, workflow: await setWorkflowActive(c.env, c.req.param("id"), Boolean(input.active)) });
});

/* ELON */

app.get("/v1/admin/elon/config", async (c) => {
  const db = c.get("db");
  const [providers, servers] = await Promise.all([
    db.select("elon_providers", { select: "id,label,base_url,model,is_default,updated_at", order: "label.asc" }),
    db.select("elon_mcp_servers", { select: "id,name,url,enabled,created_at", order: "name.asc" }),
  ]);
  return c.json({ ok: true, providers, servers });
});

app.put("/v1/admin/elon/providers/:id", async (c) => {
  const input = await body(c);
  const id = c.req.param("id");
  if (!/^[a-z0-9-]{2,40}$/.test(id)) throw new HttpError(400, "invalid_id");
  const db = c.get("db");
  const existing = await db.one("elon_providers", { id: `eq.${id}` });
  const key = optional(input.apiKey, "apiKey", 400);
  if (!existing && !key) throw new HttpError(400, "invalid_apiKey");
  if (input.isDefault) await db.update("elon_providers", { is_default: "is.true" }, { is_default: false });
  await db.upsert("elon_providers", {
    id,
    label: text(input.label, "label", 1, 80),
    base_url: httpsUrl(input.baseUrl, "baseUrl"),
    model: text(input.model, "model", 1, 120),
    api_key_enc: key ? await seal(c.env.ELON_MASTER_KEY, key) : existing!.api_key_enc,
    is_default: Boolean(input.isDefault),
    updated_at: new Date().toISOString(),
  });
  return c.json({ ok: true });
});

app.delete("/v1/admin/elon/providers/:id", async (c) => {
  await c.get("db").remove("elon_providers", { id: `eq.${c.req.param("id")}` });
  return c.json({ ok: true });
});

app.post("/v1/admin/elon/mcp", async (c) => {
  const input = await body(c);
  const auth = optional(input.authHeader, "authHeader", 2000);
  const saved = await c.get("db").insert("elon_mcp_servers", {
    name: text(input.name, "name", 1, 40),
    url: httpsUrl(input.url, "url"),
    auth_header_enc: auth ? await seal(c.env.ELON_MASTER_KEY, auth) : null,
    enabled: true,
  });
  return c.json({ ok: true, id: saved.id });
});

app.patch("/v1/admin/elon/mcp/:id", async (c) => {
  const { enabled } = await body(c);
  await c.get("db").update("elon_mcp_servers", { id: `eq.${c.req.param("id")}` }, { enabled: Boolean(enabled) });
  return c.json({ ok: true });
});

app.delete("/v1/admin/elon/mcp/:id", async (c) => {
  await c.get("db").remove("elon_mcp_servers", { id: `eq.${c.req.param("id")}` });
  return c.json({ ok: true });
});

app.get("/v1/admin/elon/runs", async (c) => {
  const runs = await c.get("db").select("elon_runs", { select: "id,status,title,updated_at", order: "updated_at.desc", limit: 30 });
  return c.json({ ok: true, runs });
});

app.get("/v1/admin/elon/runs/:id", async (c) => {
  const run = await c.get("db").one("elon_runs", { id: `eq.${c.req.param("id")}` });
  if (!run) throw new HttpError(404, "run_not_found");
  return c.json({ ok: true, run });
});

app.post("/v1/admin/elon/runs", async (c) => {
  const input = await body(c);
  const run = await startRun(c.env, c.get("db"), text(input.input, "input", 1, 6000), optional(input.providerId, "providerId", 40) ?? undefined, optional(input.runId, "runId", 40) ?? undefined);
  return c.json({ ok: true, run });
});

app.post("/v1/admin/elon/runs/:id/decision", async (c) => {
  const input = await body(c);
  if (typeof input.approve !== "boolean") throw new HttpError(400, "invalid_decision");
  return c.json({ ok: true, run: await decideRun(c.env, c.get("db"), c.req.param("id"), input.approve) });
});

app.get("/v1/admin/elon/audit", async (c) => {
  return c.json({ ok: true, audit: await c.get("db").select("elon_audit", { order: "id.desc", limit: 100 }) });
});

registerOrgRoutes(app);

export default app;
