import type { Context, Hono } from "hono";
import type { Db } from "./db";
import { HttpError, type Env } from "./env";
import { connectOrg, createOrgTask, handleHeartbeat, orgOverview } from "./elon/org";
import { httpsUrl, optional, text, timingSafeEqual } from "./validate";

type App = { Bindings: Env; Variables: { db: Db } };

async function json(c: Context<App>): Promise<Record<string, any>> {
  const parsed = await c.req.json().catch(() => null);
  if (!parsed || typeof parsed !== "object") throw new HttpError(400, "invalid_json");
  return parsed;
}

async function find(c: Context<App>) {
  const row = await c.get("db").one("elon_orgs", { id: `eq.${c.req.param("id")}` });
  if (!row) throw new HttpError(404, "org_not_found");
  return row;
}

export function registerOrgRoutes(app: Hono<App>) {
  app.post("/paperclip/heartbeat", async (c) => {
    const secret = c.env.PAPERCLIP_WEBHOOK_SECRET;
    const given = c.req.header("x-elon-secret") ?? "";
    if (!secret || !timingSafeEqual(secret, given)) throw new HttpError(401, "unauthorized");
    return c.json(await handleHeartbeat(c.env, c.get("db"), await json(c)));
  });

  app.get("/v1/admin/org", async (c) => {
    const orgs = await c.get("db").select("elon_orgs", { select: "id,name,api_url,company_id,created_at", order: "created_at.asc" });
    return c.json({ ok: true, orgs });
  });

  app.post("/v1/admin/org", async (c) => {
    const input = await json(c);
    const row = await connectOrg(c.env, c.get("db"), text(input.name, "name", 1, 80), httpsUrl(input.apiUrl, "apiUrl"), text(input.apiKey, "apiKey", 8, 500));
    return c.json({ ok: true, id: row.id });
  });

  app.delete("/v1/admin/org/:id", async (c) => {
    await c.get("db").remove("elon_orgs", { id: `eq.${c.req.param("id")}` });
    return c.json({ ok: true });
  });

  app.get("/v1/admin/org/:id/overview", async (c) => c.json({ ok: true, ...(await orgOverview(c.env, await find(c))) }));

  app.post("/v1/admin/org/:id/tasks", async (c) => {
    const input = await json(c);
    const task = await createOrgTask(c.env, await find(c), text(input.title, "title", 2, 200), text(input.description, "description", 2, 6000), optional(input.assigneeAgentId, "assignee", 64) ?? undefined);
    return c.json({ ok: true, id: task.id });
  });

  app.get("/v1/admin/elon/profile", async (c) => {
    const row = await c.get("db").one("elon_profile", { id: "eq.1" });
    return c.json({ ok: true, body: row?.body ?? "" });
  });

  app.put("/v1/admin/elon/profile", async (c) => {
    const input = await json(c);
    await c.get("db").upsert("elon_profile", { id: 1, body: text(input.body, "body", 0, 20000), updated_at: new Date().toISOString() });
    return c.json({ ok: true });
  });
}
