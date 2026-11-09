import { HttpError } from "./env";

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolSpec {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface Provider {
  baseUrl: string;
  model: string;
  apiKey: string;
}

/** One non-streaming call to any OpenAI-compatible endpoint (Groq, Google AI Studio, OpenRouter, ...). */
export async function complete(
  provider: Provider,
  messages: ChatMessage[],
  options: { tools?: ToolSpec[]; maxTokens?: number } = {},
): Promise<ChatMessage> {
  const res = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: provider.model,
      messages,
      max_tokens: options.maxTokens ?? 1200,
      ...(options.tools?.length ? { tools: options.tools, tool_choice: "auto" } : {}),
    }),
  });
  if (res.status === 429) throw new HttpError(429, "provider_rate_limited");
  if (!res.ok) {
    console.error("llm_error", provider.model, res.status, (await res.text()).slice(0, 300));
    throw new HttpError(502, "provider_error");
  }
  const data = (await res.json()) as { choices?: { message?: ChatMessage }[] };
  const message = data.choices?.[0]?.message;
  // A 200 with neither text nor tool calls is a failed inference, not an answer.
  if (!message || (!message.content?.trim() && !message.tool_calls?.length)) {
    throw new HttpError(502, "provider_empty_response");
  }
  return { role: "assistant", content: message.content ?? null, tool_calls: message.tool_calls };
}
