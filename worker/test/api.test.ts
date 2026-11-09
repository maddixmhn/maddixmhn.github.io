import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";
import { seal } from "../src/elon/crypto";
import { parseSse } from "../src/elon/mcp";
import { isPrivateHost } from "../src/validate";

const MASTER = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
const ORIGIN = "https://maddixmhn.github.io";
const SID = "abcdefghijklmnopqrstuvwx";

const env: any = {
  ALLOWED_ORIGINS: ORIGIN,
  SUPABASE_URL: "https://db.test",
  SUPABASE_SERVICE_KEY: "sb_secret_x",
  ADMIN_EMAIL: "owner@test.dev",
  TELEGRAM_BOT_TOKEN: "tok",
  TELEGRAM_ADMIN_CHAT_ID: "42",
  TELEGRAM_WEBHOOK_SECRET: "hook-secret",
  ELON_MASTER_KEY: MASTER,
};
const ctx: any = { waitUntil() {}, passThroughOnException() {} };

let tables: Record<string, any[]>;
let telegram: any[];
let llmScript: any[];
let llmBodies: any[];
let tgAccepts: boolean;

function matches(row: any, params: URLSearchParams) {
  for (const [key, raw] of params) {
    if (["select", "order", "limit"].includes(key)) continue;
    const [op, ...rest] = raw.split(".");
    const value = rest.join(".");
    if (op === "eq" && String(row[key]) !== value) return false;
    if (op === "is" && String(Boolean(row[key])) !== value) return false;
    if (op === "gt" && !(String(row[key]) > value)) return false;
  }
  return true;
}

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" }, ...init });
}

const fakeFetch = async (input: any, init: any = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (url.hostname === "api.telegram.org") {
    telegram.push(JSON.parse(init.body));
    return tgAccepts ? json({ ok: true, result: { message_id: 900 + telegram.length } }) : json({ ok: false });
  }
  if (url.hostname === "llm.test") {
    llmBodies.push(JSON.parse(init.body));
    return json({ choices: [{ message: llmScript.shift() }] });
  }
  if (url.pathname === "/auth/v1/user") {
    const token = init.headers.Authorization;
    if (token === "Bearer owner") return json({ email: "OWNER@test.dev" });
    if (token === "Bearer stranger") return json({ email: "x@test.dev" });
    return json({}, { status: 401 });
  }
  const table = url.pathname.split("/").pop()!;
  const rows = (tables[table] ??= []);
  if (init.method === "GET") {
    const columns = url.searchParams.get("select") ?? "*";
    const found = rows
      .filter((r) => matches(r, url.searchParams))
      .map((r) => (columns === "*" ? r : Object.fromEntries(columns.split(",").map((c) => [c, r[c]]))));
    return json(found, { headers: { "content-range": `0-0/${found.length}`, "Content-Type": "application/json" } });
  }
  if (init.method === "POST") {
    const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...JSON.parse(init.body) };
    const index = rows.findIndex((r) => r.id === row.id);
    if (index >= 0) rows[index] = row;
    else rows.push(row);
    return json([row]);
  }
  if (init.method === "PATCH") {
    const hit = rows.filter((r) => matches(r, url.searchParams));
    hit.forEach((r) => Object.assign(r, JSON.parse(init.body)));
    return json(hit);
  }
  tables[table] = rows.filter((r) => !matches(r, url.searchParams));
  return json([]);
};

function request(path: string, options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  return app.fetch(
    new Request(`https://api.test${path}`, {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", Origin: ORIGIN, ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }),
    env,
    ctx,
  );
}

const owner = { Authorization: "Bearer owner" };

async function addProvider() {
  tables.elon_providers = [{ id: "p", base_url: "https://llm.test/v1", model: "m", is_default: true, api_key_enc: await seal(MASTER, "key") }];
}

beforeEach(() => {
  tables = {};
  telegram = [];
  llmScript = [];
  llmBodies = [];
  tgAccepts = true;
  vi.stubGlobal("fetch", fakeFetch);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

describe("contact", () => {
  it("stores the message, tells Telegram and records the link", async () => {
    const res = await request("/v1/contact", { body: { sid: SID, message: "سلام، پروژه دارم", lang: "fa" } });
    expect(await res.json()).toMatchObject({ ok: true, notified: true });
    expect(tables.messages![0]).toMatchObject({ direction: "in", tg_message_id: 901 });
    expect(telegram[0].chat_id).toBe("42");
  });

  it("keeps the message and reports notified=false when Telegram refuses", async () => {
    tgAccepts = false;
    const res = await request("/v1/contact", { body: { sid: SID, message: "hello there" } });
    expect(await res.json()).toMatchObject({ ok: true, notified: false });
    expect(tables.messages).toHaveLength(1);
  });

  it.each([
    [{ sid: "short", message: "hello" }, 400],
    [{ sid: SID, message: "x" }, 400],
    [{ sid: SID, message: "hello", website: "bot" }, 400],
  ])("rejects bad input %#", async (payload, status) => {
    expect((await request("/v1/contact", { body: payload })).status).toBe(status);
    expect(tables.messages ?? []).toHaveLength(0);
  });

  it("rejects other origins", async () => {
    const res = await request("/v1/contact", { body: { sid: SID, message: "hello" }, headers: { Origin: "https://evil.test" } });
    expect(res.status).toBe(403);
  });
});

describe("telegram webhook", () => {
  const update = { message: { text: "جواب", chat: { id: 42 }, reply_to_message: { message_id: 901 } } };

  beforeEach(async () => {
    await request("/v1/contact", { body: { sid: SID, message: "hello there" } });
    telegram = [];
  });

  it("needs the secret header", async () => {
    expect((await request("/telegram/webhook", { body: update })).status).toBe(401);
  });

  it("delivers the owner's reply to the visitor poll", async () => {
    await request("/telegram/webhook", { body: update, headers: { "x-telegram-bot-api-secret-token": "hook-secret" } });
    const res = await request(`/v1/contact/${SID}/replies`);
    expect(((await res.json()) as any).replies[0].body).toBe("جواب");
  });

  it("ignores everyone except the owner chat", async () => {
    const intruder = { message: { ...update.message, chat: { id: 7 } } };
    await request("/telegram/webhook", { body: intruder, headers: { "x-telegram-bot-api-secret-token": "hook-secret" } });
    expect(tables.messages!.filter((m) => m.direction === "out")).toHaveLength(0);
  });
});

describe("admin auth", () => {
  it("refuses anonymous, invalid and non-owner tokens", async () => {
    expect((await request("/v1/admin/overview")).status).toBe(401);
    expect((await request("/v1/admin/overview", { headers: { Authorization: "Bearer bad" } })).status).toBe(401);
    expect((await request("/v1/admin/overview", { headers: { Authorization: "Bearer stranger" } })).status).toBe(403);
  });

  it("allows the owner", async () => {
    expect((await request("/v1/admin/overview", { headers: owner })).status).toBe(200);
  });
});

describe("elon", () => {
  const replyCall = { id: "c1", type: "function", function: { name: "inbox_reply", arguments: JSON.stringify({ sid: SID, text: "hi" }) } };

  it("runs read tools without approval", async () => {
    await addProvider();
    tables.messages = [{ id: "1", direction: "in", status: "new", body: "x" }];
    llmScript = [{ content: null, tool_calls: [{ id: "c", type: "function", function: { name: "inbox_list", arguments: "{}" } }] }, { content: "one message" }];
    const res = (await (await request("/v1/admin/elon/runs", { body: { input: "inbox?" }, headers: owner })).json()) as any;
    expect(res.run.status).toBe("done");
    expect(tables.elon_audit![0]).toMatchObject({ tool: "inbox_list", decision: "auto", ok: true });
  });

  it("pauses writes, and performs nothing until approved", async () => {
    await addProvider();
    llmScript = [{ content: null, tool_calls: [replyCall] }];
    const res = (await (await request("/v1/admin/elon/runs", { body: { input: "reply" }, headers: owner })).json()) as any;
    expect(res.run.status).toBe("awaiting_approval");
    expect(tables.messages ?? []).toHaveLength(0);

    llmScript = [{ content: "done" }];
    const after = (await (await request(`/v1/admin/elon/runs/${res.run.id}/decision`, { body: { approve: true }, headers: owner })).json()) as any;
    expect(after.run.status).toBe("done");
    expect(tables.messages!.filter((m) => m.direction === "out")).toHaveLength(1);
  });

  it("does not run a denied write and cannot be approved twice", async () => {
    await addProvider();
    llmScript = [{ content: null, tool_calls: [replyCall] }];
    const res = (await (await request("/v1/admin/elon/runs", { body: { input: "reply" }, headers: owner })).json()) as any;
    llmScript = [{ content: "ok, not sent" }];
    await request(`/v1/admin/elon/runs/${res.run.id}/decision`, { body: { approve: false }, headers: owner });
    expect(tables.messages ?? []).toHaveLength(0);
    expect(tables.elon_audit![0]).toMatchObject({ decision: "denied" });
    expect((await request(`/v1/admin/elon/runs/${res.run.id}/decision`, { body: { approve: true }, headers: owner })).status).toBe(409);
  });

  it("treats a 200 with no content as a failure", async () => {
    await addProvider();
    llmScript = [{ content: "   " }];
    const res = (await (await request("/v1/admin/elon/runs", { body: { input: "hi" }, headers: owner })).json()) as any;
    expect(res.run).toMatchObject({ status: "error", error: "provider_empty_response" });
  });

  it("never returns stored keys", async () => {
    await addProvider();
    const raw = await (await request("/v1/admin/elon/config", { headers: owner })).text();
    expect(tables.elon_providers![0].api_key_enc).toBeTruthy();
    expect(raw).not.toContain("api_key_enc\":\"");
  });
});

describe("helpers", () => {
  it("parses the matching SSE frame", () => {
    const sse = 'event: message\ndata: {"id":1,"result":{"a":1}}\n\ndata: {"id":2,"result":{"b":2}}\n\n';
    expect(parseSse(sse, 2).result).toEqual({ b: 2 });
  });

  it.each(["localhost", "127.0.0.1", "10.2.3.4", "192.168.1.1", "169.254.169.254", "[::1]"])("blocks %s", (host) => {
    expect(isPrivateHost(host)).toBe(true);
  });

  it("allows public hosts", () => {
    expect(isPrivateHost("mcp.example.com")).toBe(false);
  });
});
