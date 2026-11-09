import { HttpError } from "./env";

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function text(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== "string") throw new HttpError(400, `invalid_${field}`);
  const clean = value.replace(CONTROL, "").trim();
  if (clean.length < min || clean.length > max) throw new HttpError(400, `invalid_${field}`);
  return clean;
}

export function optional(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return text(value, field, 0, max);
}

export function lang(value: unknown): "fa" | "en" {
  return value === "fa" ? "fa" : "en";
}

export function sid(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{22,64}$/.test(value)) {
    throw new HttpError(400, "invalid_sid");
  }
  return value;
}

export function httpsUrl(value: unknown, field: string): string {
  const raw = text(value, field, 8, 500);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, `invalid_${field}`);
  }
  if (url.protocol !== "https:" || isPrivateHost(url.hostname)) throw new HttpError(400, `invalid_${field}`);
  return url.toString().replace(/\/$/, "");
}

/** Rejects loopback, link-local and RFC1918 targets so a stored URL cannot be pointed inward. */
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return true;
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return (
    a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
  );
}

export function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}
