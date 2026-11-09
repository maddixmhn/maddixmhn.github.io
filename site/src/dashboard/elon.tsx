import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { Identity } from "./org";
import { Badge, Button, dateFa, Empty, ErrorNote, Field, inputClass, Loading, Panel, useLoad } from "./ui";

const PRESETS = [
  { id: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-20b" },
  { id: "gemini", label: "Google AI Studio", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-flash-latest" },
  { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "" },
];

const STATUS: Record<string, [string, "good" | "warn" | "bad" | "neutral"]> = {
  done: ["تمام شد", "good"],
  awaiting_approval: ["منتظر تأیید", "warn"],
  error: ["خطا", "bad"],
  running: ["در حال اجرا", "neutral"],
};

function Chat() {
  const runs = useLoad(() => api("/elon/runs"));
  const [run, setRun] = useState<any>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [run, busy]);

  async function act(action: () => Promise<any>) {
    setBusy(true);
    setError(null);
    try {
      setRun((await action()).run);
      runs.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    act(() => api("/elon/runs", { body: { input: text, runId: run?.id } }));
  };
  const visible = (run?.messages ?? []).filter((m: any) => m.role !== "system");

  return (
    <div className="grid gap-3 lg:grid-cols-[17rem_1fr]">
      <Panel className="max-h-[72dvh] overflow-y-auto p-2">
        <Button className="mb-2 w-full" variant="ghost" onClick={() => setRun(null)}>گفتگوی جدید</Button>
        {(runs.data?.runs ?? []).map((r: any) => (
          <button key={r.id} type="button" className={`block w-full rounded-xl p-2 text-start text-sm hover:bg-white/10 ${run?.id === r.id ? "bg-white/10" : ""}`} onClick={() => act(() => api(`/elon/runs/${r.id}`))}>
            <span className="block truncate" dir="auto">{r.title}</span>
            <Badge tone={STATUS[r.status]?.[1]}>{STATUS[r.status]?.[0]}</Badge>
          </button>
        ))}
      </Panel>
      <Panel className="grid min-h-[60dvh] content-between gap-3">
        <div className="grid max-h-[62dvh] content-start gap-2 overflow-y-auto">
          {!visible.length && <Empty>از ELON بخواهید پیام‌ها، درخواست‌ها یا گردش‌کارها را بررسی کند. هر کاری که چیزی را تغییر دهد، اول از شما تأیید می‌گیرد.</Empty>}
          {visible.map((m: any, i: number) => m.role === "tool" ? (
            <details key={i} className="rounded-xl bg-black/20 p-2 text-sm"><summary className="cursor-pointer text-[var(--dust)]">نتیجهٔ ابزار</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap" dir="ltr">{m.content}</pre></details>
          ) : m.content ? (
            <div key={i} dir="auto" className={`max-w-[88%] whitespace-pre-wrap rounded-2xl p-3 ${m.role === "user" ? "justify-self-end bg-[#43d9cf22]" : "justify-self-start bg-white/10"}`}>{m.content}</div>
          ) : null)}
          {busy && <p role="status" className="text-sm text-[var(--dust)]">ELON در حال کار است</p>}
          {run?.status === "error" && <ErrorNote error={Object.assign(new Error(run.error), { name: "run" })} />}
          <div ref={end} />
        </div>
        {run?.status === "awaiting_approval" && (
          <div className="grid gap-2 rounded-xl border border-[#f5b94c66] bg-[#f5b94c14] p-3">
            <strong>این کارها منتظر تأیید شماست</strong>
            {run.pending.map((p: any) => (
              <div key={p.id}><bdi className="font-semibold">{p.name}</bdi><pre className="mt-1 overflow-x-auto rounded-lg bg-black/25 p-2 text-sm" dir="ltr">{JSON.stringify(p.args, null, 2)}</pre></div>
            ))}
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => act(() => api(`/elon/runs/${run.id}/decision`, { body: { approve: true } }))}>انجام بده</Button>
              <Button disabled={busy} variant="danger" onClick={() => act(() => api(`/elon/runs/${run.id}/decision`, { body: { approve: false } }))}>رد کن</Button>
            </div>
          </div>
        )}
        {error ? <ErrorNote error={error} /> : null}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input className={inputClass} dir="auto" aria-label="دستور به ELON" placeholder="چه کاری انجام شود؟" value={input} disabled={run?.status === "awaiting_approval"} onChange={(e) => setInput(e.target.value)} />
          <Button type="submit" disabled={busy || run?.status === "awaiting_approval"}>ارسال</Button>
        </form>
      </Panel>
    </div>
  );
}

function Settings() {
  const { data, error, loading, reload } = useLoad(() => api("/elon/config"));
  const [provider, setProvider] = useState({ id: "groq", label: "Groq", baseUrl: PRESETS[0]!.baseUrl, model: PRESETS[0]!.model, apiKey: "", isDefault: true });
  const [server, setServer] = useState({ name: "", url: "", authHeader: "" });
  const [saveError, setSaveError] = useState<unknown>(null);

  async function save(action: () => Promise<unknown>, after?: () => void) {
    setSaveError(null);
    try {
      await action();
      after?.();
      await reload();
    } catch (e) {
      setSaveError(e);
    }
  }

  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {saveError ? <div className="lg:col-span-2"><ErrorNote error={saveError} /></div> : null}
      <Panel className="grid content-start gap-3">
        <h2 className="font-semibold">مدل‌ها و کلید API</h2>
        {data.providers.map((p: any) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 p-2">
            <span>{p.label} <bdi className="text-sm text-[var(--dust)]">{p.model}</bdi> {p.is_default && <Badge tone="good">پیش‌فرض</Badge>}</span>
            <Button variant="danger" onClick={() => save(() => api(`/elon/providers/${p.id}`, { method: "DELETE" }))}>حذف</Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => <Button key={p.id} variant="ghost" onClick={() => setProvider({ ...provider, ...p, apiKey: "" })}>{p.label}</Button>)}
        </div>
        <Field label="شناسه"><input className={inputClass} dir="ltr" value={provider.id} onChange={(e) => setProvider({ ...provider, id: e.target.value })} /></Field>
        <Field label="آدرس سازگار با OpenAI"><input className={inputClass} dir="ltr" value={provider.baseUrl} onChange={(e) => setProvider({ ...provider, baseUrl: e.target.value })} /></Field>
        <Field label="نام مدل"><input className={inputClass} dir="ltr" value={provider.model} onChange={(e) => setProvider({ ...provider, model: e.target.value })} /></Field>
        <Field label="کلید API (رمزشده ذخیره می‌شود و دیگر نمایش داده نمی‌شود)"><input className={inputClass} dir="ltr" type="password" autoComplete="off" value={provider.apiKey} onChange={(e) => setProvider({ ...provider, apiKey: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={provider.isDefault} onChange={(e) => setProvider({ ...provider, isDefault: e.target.checked })} />مدل پیش‌فرض باشد</label>
        <Button onClick={() => save(() => api(`/elon/providers/${provider.id}`, { method: "PUT", body: { ...provider, label: provider.label || provider.id } }), () => setProvider({ ...provider, apiKey: "" }))}>ذخیرهٔ مدل</Button>
      </Panel>
      <Panel className="grid content-start gap-3">
        <h2 className="font-semibold">سرورهای MCP</h2>
        {data.servers.map((s: any) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 p-2">
            <span>{s.name} <bdi className="text-sm text-[var(--dust)]">{s.url}</bdi></span>
            <span className="flex gap-2">
              <Button variant="ghost" onClick={() => save(() => api(`/elon/mcp/${s.id}`, { method: "PATCH", body: { enabled: !s.enabled } }))}>{s.enabled ? "غیرفعال" : "فعال"}</Button>
              <Button variant="danger" onClick={() => save(() => api(`/elon/mcp/${s.id}`, { method: "DELETE" }))}>حذف</Button>
            </span>
          </div>
        ))}
        <Field label="نام"><input className={inputClass} dir="ltr" value={server.name} onChange={(e) => setServer({ ...server, name: e.target.value })} /></Field>
        <Field label="آدرس HTTPS سرور (Streamable HTTP)"><input className={inputClass} dir="ltr" value={server.url} onChange={(e) => setServer({ ...server, url: e.target.value })} /></Field>
        <Field label="هدر Authorization (اختیاری)"><input className={inputClass} dir="ltr" type="password" autoComplete="off" placeholder="Bearer ..." value={server.authHeader} onChange={(e) => setServer({ ...server, authHeader: e.target.value })} /></Field>
        <Button onClick={() => save(() => api("/elon/mcp", { body: server }), () => setServer({ name: "", url: "", authHeader: "" }))}>افزودن سرور</Button>
        <p className="text-sm text-[var(--dust)]">ابزارهایی که خود را فقط‌خواندنی معرفی نکنند، قبل از اجرا تأیید می‌خواهند.</p>
      </Panel>
    </div>
  );
}

function Audit() {
  const { data, error, loading, reload } = useLoad(() => api("/elon/audit"));
  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data.audit.length) return <Empty>هنوز ابزاری اجرا نشده است.</Empty>;
  const decision: Record<string, string> = { auto: "خودکار", approved: "تأیید شد", denied: "رد شد" };
  return (
    <div className="grid gap-2">
      {data.audit.map((a: any) => (
        <Panel key={a.id} className="grid gap-1 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <bdi className="font-semibold">{a.tool}</bdi>
            <span className="flex items-center gap-2"><Badge tone={a.decision === "denied" ? "bad" : "neutral"}>{decision[a.decision]}</Badge>{a.decision !== "denied" && <Badge tone={a.ok ? "good" : "bad"}>{a.ok ? "موفق" : "ناموفق"}</Badge>}<span className="text-[var(--dust)]">{dateFa(a.created_at)}</span></span>
          </div>
          <pre className="overflow-x-auto text-[var(--dust)]" dir="ltr">{JSON.stringify(a.args)}</pre>
        </Panel>
      ))}
    </div>
  );
}

const TABS = [["chat", "گفتگو"], ["identity", "هویت"], ["settings", "مدل‌ها و MCP"], ["audit", "گزارش اجرا"]] as const;

export function ELON() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("chat");
  return (
    <div className="grid gap-3">
      <div role="tablist" className="flex gap-1">
        {TABS.map(([id, label]) => <Button key={id} role="tab" aria-selected={tab === id} variant={tab === id ? "primary" : "ghost"} onClick={() => setTab(id)}>{label}</Button>)}
      </div>
      {tab === "chat" && <Chat />}
      {tab === "identity" && <Identity />}
      {tab === "settings" && <Settings />}
      {tab === "audit" && <Audit />}
    </div>
  );
}
