import { useCallback, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { errorText } from "./api";

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const look = {
    primary: "bg-[var(--starlight)] text-[var(--void)] hover:bg-white",
    ghost: "border border-[var(--glass-line)] bg-[var(--glass)] hover:bg-[var(--glass-strong)]",
    danger: "border border-[#ff5c7a66] bg-[#ff5c7a22] text-[#ffc2ce] hover:bg-[#ff5c7a33]",
  }[variant];
  return <button type="button" {...props} className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors disabled:cursor-progress disabled:opacity-60 ${look} ${className}`} />;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[var(--glass-line)] bg-[var(--glass)] p-4 backdrop-blur-xl ${className}`}>{children}</section>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-sm text-[var(--dust)]">{label}{children}</label>;
}

export const inputClass = "w-full rounded-xl border border-[var(--glass-line)] bg-white/5 px-3 py-2 text-[var(--starlight)]";

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad"; children: ReactNode }) {
  const look = { neutral: "bg-white/10 text-[var(--dust)]", good: "bg-[#43d9cf22] text-[var(--o-iii)]", warn: "bg-[#f5b94c22] text-[var(--s-ii)]", bad: "bg-[#ff5c7a22] text-[#ffb0be]" }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${look}`}>{children}</span>;
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ff5c7a55] bg-[#ff5c7a14] p-3 text-sm">
      <span>{errorText(error)}</span>
      {onRetry && <Button variant="ghost" onClick={onRetry}>تلاش دوباره</Button>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-[var(--glass-line)] p-8 text-center text-[var(--dust)]">{children}</p>;
}

export function Loading() {
  return <p role="status" className="p-8 text-center text-[var(--dust)]">در حال بارگذاری</p>;
}

export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}

export const dateFa = (value: string) => new Date(value).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" });
