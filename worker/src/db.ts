import { HttpError, type Env } from "./env";

export type Row = Record<string, any>;
export type Query = Record<string, string | number>;

/** Thin PostgREST client. Kept to plain fetch so the Worker stays inside the free plan's CPU limit. */
export function createDb(env: Env, fetcher: typeof fetch = fetch) {
  const key = env.SUPABASE_SERVICE_KEY;
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  // Legacy service keys are JWTs; the newer sb_secret_ keys must only travel in `apikey`.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;

  async function call(method: string, table: string, query: Query, body?: unknown, prefer?: string) {
    const params = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]));
    const res = await fetcher(`${env.SUPABASE_URL}/rest/v1/${table}?${params}`, {
      method,
      headers: prefer ? { ...headers, Prefer: prefer } : headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("db_error", method, table, res.status, (await res.text()).slice(0, 300));
      throw new HttpError(502, "database_error");
    }
    return res;
  }

  return {
    async select(table: string, query: Query = {}): Promise<Row[]> {
      return (await (await call("GET", table, { select: "*", ...query })).json()) as Row[];
    },
    async one(table: string, query: Query): Promise<Row | null> {
      const rows = (await (await call("GET", table, { select: "*", limit: 1, ...query })).json()) as Row[];
      return rows[0] ?? null;
    },
    async count(table: string, query: Query = {}): Promise<number> {
      const res = await call("GET", table, { select: "id", limit: 1, ...query }, undefined, "count=exact");
      return Number(res.headers.get("content-range")?.split("/")[1] ?? 0);
    },
    async insert(table: string, row: Row): Promise<Row> {
      const res = await call("POST", table, {}, row, "return=representation");
      return ((await res.json()) as Row[])[0] as Row;
    },
    async upsert(table: string, row: Row): Promise<void> {
      await call("POST", table, {}, row, "resolution=merge-duplicates,return=minimal");
    },
    async update(table: string, query: Query, patch: Row): Promise<Row[]> {
      return (await (await call("PATCH", table, query, patch, "return=representation")).json()) as Row[];
    },
    async remove(table: string, query: Query): Promise<void> {
      await call("DELETE", table, query);
    },
  };
}

export type Db = ReturnType<typeof createDb>;
