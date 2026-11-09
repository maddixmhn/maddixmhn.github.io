import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";
import { seal } from "../src/elon/crypto";

const MASTER = btoa(String.fromCharCode(...new Uint8Array(32).fill(3)));
const env: any = {
  ALLOWED_ORIGINS: "https://site.test",
  SUPABASE_URL: "https://db.test",
  SUPABASE_SERVICE_KEY: "sb_secret_x",
  ADMIN_EMAIL: "owner@test.dev",
  TELEGRAM_BOT_TOKEN: "tok",
  TELEGRAM_ADMIN_CHAT_ID: "42",
  ELON_MASTER_KEY: MASTER,
  PAPERCLIP_WEBHOOK_SECRET: "wake",
};
const ctx: any = { waitUntil() {}, passThroughOnException() {} };

let tables: Record<string, any[]>;
let llm: any[];
let telegram: any[];
let paperclip: { method: string; path: string; body: any; run: string | null }[];
let checkoutStatus: number;

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });

const fakeFetch = async (input: any, init: any = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "api.telegram.org") {
    telegram.push(JSON.parse(init.body));
    return json({ ok: true, result: { message_id: 1 } });
  }
  if (url.hostname === "llm.test") return json({ choices: [{ message: llm.shift() }] });
  if (url.hostname === "pc.test") {
    const path = url.pathname.replace("/api", "");
    const method = init.method ?? "GET";
    paperclip.push({ method, path, body: init.body ? JSON.parse(init.body) : null, run: init.headers["X-Paperclip-Run-Id"] ?? null });
    if (path.endsWith("/checkout")) return json({}, checkoutStatus);
    if (path === "/agents/me") return json({ id: "ceo", companyId: "co" });
    if (path === "/issues/t1") return json({ id: "t1", title: "Plan launch", description: "Ship it" });
    if (path === "/issues/t1/comments") return json([]);
    if (path === "/companies/co/agents") {
      return json([
        { id: "ceo", name: "ELON", status: "running" },
        { id: "lead", name: "Eng", title: "Engineering lead", reportsTo: "ceo", status: "idle" },
        { id: "a1", name: "Dev", reportsTo: "lead", status: "paused" },
      ]);
    }
    if (path === "/companies/co/issues" && method === "GET") return json([{ id: "t1", title: "Plan launch", status: "todo" }]);
    return json({ id: "new" });
  }
  if (url.pathname === "/auth/v1/user") return json({ email: "owner@test.dev" });
  const table = url.pathname.split("/").pop()!;
  const rows = (tables[table] ??= []);
  const eq = (r: any) =>
    [...url.searchParams].every(([k, v]) => {
      if (["select", "order", "limit"].includes(k)) return true;
      const value = v.slice(v.indexOf(".") + 1);
      return v.startsWith("is.") ? String(Boolean(r[k])) === value : String(r[k]) === value;
    });
  if (init.method === "GET") {
    const columns = url.searchParams.get("select") ?? "*";
    const found = rows.filter(eq).map((r) => (columns === "*" ? r : Object.fromEntries(columns.split(",").map((c) => [c, r[c]]))));
    return json(found, 200, { "content-range": `0-0/${found.length}` });
  }
  if (init.method === "POST") {
    const row = { id: crypto.randomUUID(), ...JSON.parse(init.body) };
    rows.push(row);
    return json([row]);
  }
  if (init.method === "PATCH") {
    const hit = rows.filter(eq);
    hit.forEach((r) => Object.assign(r, JSON.parse(init.body)));
    return json(hit);
  }
  return json([]);
};

const beat = (body: unknown, secret = "wake") =>
  app.fetch(new Request("https://api.test/paperclip/heartbeat", { method: "POST", headers: { "x-elon-secret": secret, "Content-Type": "application/json" }, body: JSON.stringify(body) }), env, ctx);

const wake = { runId: "r1", agentId: "ceo", context: { taskId: "t1", wakeReason: "assignment" } };

beforeEach(async () => {
  tables = {
    elon_orgs: [{ id: "o1", name: "Shiktak", api_url: "https://pc.test", api_key_enc: await seal(MASTER, "agent-key"), company_id: "co", agent_id: "ceo" }],
    elon_providers: [{ id: "p", base_url: "https://llm.test/v1", model: "m", is_default: true, api_key_enc: await seal(MASTER, "k") }],
    elon_profile: [{ id: 1, body: "Ship small, check everything." }],
  };
  llm = [];
  telegram = [];
  paperclip = [];
  checkoutStatus = 200;
  vi.stubGlobal("fetch", fakeFetch);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

describe("paperclip heartbeat", () => {
  it("rejects a wrong secret", async () => {
    expect((await beat(wake, "nope")).status).toBe(401);
  });

  it("delegates inside the company without waiting for approval, and reports back", async () => {
    llm = [
      { content: null, tool_calls: [{ id: "c", type: "function", function: { name: "org_delegate", arguments: JSON.stringify({ title: "Build", description: "Do it", assigneeAgentId: "a1" }) } }] },
      { content: "Delegated to engineering." },
    ];
    expect(await (await beat(wake)).json()).toMatchObject({ ok: true, status: "done" });
    const created = paperclip.find((p) => p.method === "POST" && p.path === "/companies/co/issues");
    expect(created).toMatchObject({ body: { assigneeAgentId: "a1" }, run: "r1" });
    expect(paperclip.at(-1)).toMatchObject({ method: "PATCH", path: "/issues/t1", body: { comment: "Delegated to engineering." } });
    expect(tables.elon_runs![0].messages[0].content).toContain("Ship small");
  });

  it("does not retry a task another agent owns", async () => {
    checkoutStatus = 409;
    expect(await (await beat(wake)).json()).toMatchObject({ ok: true, skipped: true });
    expect(tables.elon_runs ?? []).toHaveLength(0);
  });

  it("blocks the task and tells the owner when an outside action needs approval", async () => {
    llm = [{ content: null, tool_calls: [{ id: "c", type: "function", function: { name: "telegram_notify", arguments: '{"text":"hi"}' } }] }];
    expect(await (await beat(wake)).json()).toMatchObject({ status: "awaiting_approval" });
    expect(paperclip.at(-1)).toMatchObject({ method: "PATCH", body: { status: "blocked" } });
    expect(telegram).toHaveLength(1);
    expect(telegram[0].text).toContain("approval");
  });

  it("ignores agents that are not the top of a connected company", async () => {
    expect((await beat({ ...wake, agentId: "stranger" })).status).toBe(404);
  });
});

describe("dashboard", () => {
  const owner = { Authorization: "Bearer t", "Content-Type": "application/json" };

  it("groups agents into departments", async () => {
    const res = await app.fetch(new Request("https://api.test/v1/admin/org/o1/overview", { headers: owner }), env, ctx);
    const data = (await res.json()) as any;
    expect(data.agents.total).toBe(3);
    expect(data.departments[0]).toMatchObject({ name: "Engineering lead", total: 2, paused: 1 });
  });

  it("never returns the stored key", async () => {
    const raw = await (await app.fetch(new Request("https://api.test/v1/admin/org", { headers: owner }), env, ctx)).text();
    expect(raw).not.toContain("api_key_enc");
  });
});
