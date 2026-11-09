import { HttpError, type Env } from "./env";

type N8nEnv = Pick<Env, "N8N_BASE_URL" | "N8N_API_KEY">;

async function call(env: N8nEnv, path: string, init: RequestInit = {}): Promise<any> {
  if (!env.N8N_BASE_URL || !env.N8N_API_KEY) throw new HttpError(503, "n8n_not_configured");
  const res = await fetch(`${env.N8N_BASE_URL.replace(/\/$/, "")}/api/v1${path}`, {
    ...init,
    headers: { "X-N8N-API-KEY": env.N8N_API_KEY, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    console.error("n8n_error", path, res.status);
    throw new HttpError(502, "n8n_error");
  }
  return res.json();
}

export async function listWorkflows(env: N8nEnv) {
  const data = await call(env, "/workflows?limit=100");
  return (data.data as any[]).map((w) => ({
    id: String(w.id),
    name: String(w.name),
    active: Boolean(w.active),
    updatedAt: w.updatedAt,
    nodes: Array.isArray(w.nodes) ? w.nodes.length : 0,
  }));
}

export async function setWorkflowActive(env: N8nEnv, id: string, active: boolean) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new HttpError(400, "invalid_workflow_id");
  await call(env, `/workflows/${id}/${active ? "activate" : "deactivate"}`, { method: "POST" });
  return { id, active };
}

export async function listExecutions(env: N8nEnv, limit = 25) {
  const data = await call(env, `/executions?limit=${Math.min(limit, 100)}`);
  return (data.data as any[]).map((e) => ({
    id: String(e.id),
    workflowId: String(e.workflowId),
    status: String(e.status ?? (e.finished ? "success" : "unknown")),
    startedAt: e.startedAt,
    stoppedAt: e.stoppedAt,
    mode: e.mode,
  }));
}

/** Tells n8n about a new event. Signed so the workflow can reject anything else hitting the URL. */
export async function emitEvent(env: Env, type: string, payload: Record<string, unknown>): Promise<void> {
  if (!env.N8N_EVENT_WEBHOOK) return;
  const body = JSON.stringify({ type, at: new Date().toISOString(), payload });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.N8N_EVENT_SECRET) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.N8N_EVENT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    headers["X-Signature-256"] = [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  try {
    const res = await fetch(env.N8N_EVENT_WEBHOOK, { method: "POST", headers, body });
    if (!res.ok) console.error("n8n_event_rejected", type, res.status);
  } catch (error) {
    console.error("n8n_event_unreachable", type, String(error));
  }
}
