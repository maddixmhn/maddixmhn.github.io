import { createClient } from "@supabase/supabase-js";
import { API_URL, SUPABASE_KEY, SUPABASE_URL } from "../lib/config";

export const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
export const configured = Boolean(supabase && API_URL);

export class ApiError extends Error {}

const MESSAGES: Record<string, string> = {
  unauthorized: "نشست شما تمام شده است. دوباره وارد شوید.",
  forbidden: "این حساب مالک داشبورد نیست.",
  n8n_not_configured: "n8n هنوز به API وصل نشده است. N8N_BASE_URL و N8N_API_KEY را تنظیم کنید.",
  n8n_error: "n8n پاسخ درستی نداد. روشن‌بودن سرور و کلید API را بررسی کنید.",
  elon_no_provider: "اول یک مدل و کلید API در بخش تنظیمات ELON اضافه کنید.",
  elon_master_key_missing: "ELON_MASTER_KEY روی Worker تنظیم نشده است.",
  provider_rate_limited: "سهمیهٔ رایگان این مدل پر شده است. کمی بعد دوباره تلاش کنید یا مدل را عوض کنید.",
  provider_error: "سرویس مدل خطا داد. آدرس، نام مدل و کلید را بررسی کنید.",
  provider_empty_response: "مدل پاسخ خالی برگرداند و این درخواست انجام نشد.",
  run_not_awaiting_approval: "این کار قبلاً تأیید یا رد شده است.",
  database_error: "دیتابیس پاسخ نداد. وضعیت پروژهٔ Supabase را بررسی کنید.",
};

export function errorText(error: unknown): string {
  if (error instanceof ApiError) return MESSAGES[error.message] ?? `خطا: ${error.message}`;
  return "ارتباط با API برقرار نشد. اتصال اینترنت و آدرس Worker را بررسی کنید.";
}

export async function api<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabase!.auth.getSession();
  const res = await fetch(`${API_URL}/v1/admin${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.ok === false) throw new ApiError(payload.error ?? `http_${res.status}`);
  return payload as T;
}
