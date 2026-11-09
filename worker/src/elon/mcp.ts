import { HttpError } from "../env";

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
}

const PROTOCOL = "2025-06-18";

/**
 * Minimal MCP client for the Streamable HTTP transport. Only initialize, tools/list and tools/call
 * are needed here; the official SDK and its schema layer do not fit the free plan's 10 ms CPU budget.
 */
export class McpClient {
  private session: string | null = null;
  private nextId = 1;

  constructor(
    private readonly url: string,
    private readonly authHeader: string | null,
  ) {}

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": PROTOCOL,
    };
    if (this.authHeader) headers.Authorization = this.authHeader;
    if (this.session) headers["Mcp-Session-Id"] = this.session;
    return headers;
  }

  private async rpc(method: string, params: unknown): Promise<any> {
    const id = this.nextId++;
    const res = await fetch(this.url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    });
    if (!res.ok) throw new HttpError(502, "mcp_server_error");
    this.session = res.headers.get("Mcp-Session-Id") ?? this.session;
    const body = await res.text();
    const payload = res.headers.get("Content-Type")?.includes("text/event-stream")
      ? parseSse(body, id)
      : JSON.parse(body);
    if (payload?.error) throw new HttpError(502, "mcp_tool_error");
    return payload?.result;
  }

  async connect(): Promise<void> {
    await this.rpc("initialize", {
      protocolVersion: PROTOCOL,
      capabilities: {},
      clientInfo: { name: "elon-os", version: "1.0.0" },
    });
    await fetch(this.url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });
  }

  async listTools(): Promise<McpTool[]> {
    return ((await this.rpc("tools/list", {}))?.tools ?? []) as McpTool[];
  }

  async callTool(name: string, args: unknown): Promise<string> {
    const result = await this.rpc("tools/call", { name, arguments: args });
    const text = (result?.content ?? [])
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("\n");
    return result?.isError ? `Tool reported an error: ${text}` : text;
  }
}

export function parseSse(body: string, id: number): any {
  for (const block of body.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("");
    if (!data) continue;
    const message = JSON.parse(data);
    if (message.id === id) return message;
  }
  throw new HttpError(502, "mcp_no_response");
}
