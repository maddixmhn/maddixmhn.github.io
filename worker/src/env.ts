export interface Env {
  ALLOWED_ORIGINS: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  ADMIN_EMAIL: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_ADMIN_CHAT_ID?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  ELON_MASTER_KEY?: string;
  PAPERCLIP_WEBHOOK_SECRET?: string;
  N8N_BASE_URL?: string;
  N8N_API_KEY?: string;
  N8N_EVENT_WEBHOOK?: string;
  N8N_EVENT_SECRET?: string;
  PUBLIC_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

export class HttpError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 429 | 502 | 503,
    readonly code: string,
  ) {
    super(code);
  }
}
