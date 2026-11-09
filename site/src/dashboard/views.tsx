import { useMemo, useState } from "react";
import { N8N_EDITOR_URL } from "../lib/config";
import { api } from "./api";
import { SystemMap, Tile } from "./org";
import { Badge, Button, dateFa, Empty, ErrorNote, inputClass, Loading, Panel, useLoad } from "./ui";

const SERVICE_LABEL: Record<string, string> = {
  telegram: "ربات تلگرام",
  assistant: "دستیار سایت",
  n8n: "API اتوماسیون n8n",
  n8nEvents: "رویدادهای n8n",
  elonVault: "گاوصندوق کلیدهای ELON",
  paperclip: "وبهوک سازمان‌های Paperclip",
};

export function Overview() {
  const { data, error, loading, reload } = useLoad(() => api("/overview"));
  if (loading) return <Loading />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  const stats = [
    ["پیام خوانده‌نشده", data.unread],
    ["درخواست همکاری جدید", data.collab],
    ["کار منتظر تأیید ELON", data.elonPending],
    ["کل اجراهای ELON", data.elonRuns],
  ];
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => <Tile key={label as string} value={Number(value)} label={label as string} />)}
      </div>
      <SystemMap services={data.services} />
      <Panel>
        <h2 className="mb-3 font-semibold">وضعیت تنظیمات</h2>
        <ul className="grid gap-2">
          {Object.entries(data.services as Record<string, boolean>).map(([key, on]) => (
            <li key={key} className="flex items-center justify-between gap-3">
              <span>{SERVICE_LABEL[key] ?? key}</span>
              <Badge tone={on ? "good" : "warn"}>{on ? "تنظیم شده" : "تنظیم نشده"}</Badge>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-[var(--dust)]">«تنظیم شده» یعنی کلیدش وجود دارد، نه اینکه سرویس همین حالا پاسخ می‌دهد.</p>
      </Panel>
    </div>
  );
}

export function Inbox() {
  const { data, error, loading, reload } = useLoad(() => api("/messages"));
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<unknown>(null);

  const threads = useMemo(() => {
    const map = new Map<string, any[]>();
    [...(data?.messages ?? [])].reverse().forEach((m: any) => map.set(m.sid, [...(map.get(m.sid) ?? []), m]));
    return [...map.entries()].sort((a, b) => b[1].at(-1).created_at.localeCompare(a[1].at(-1).created_at));
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!threads.length) return <Empty>هنوز پیامی نرسیده است. پیام‌های ویجت سایت اینجا و در تلگرام نمایش داده می‌شوند.</Empty>;

  const current = threads.find(([sid]) => sid === active)?.[1];

  async function open(sid: string, messages: any[]) {
    setActive(sid);
    await Promise.all(messages.filter((m) => m.direction === "in" && m.status === "new").map((m) => api(`/messages/${m.id}`, { method: "PATCH", body: { status: "read" } }).catch(() => undefined)));
  }

  async function send() {
    if (!draft.trim() || !active) return;
    setBusy(true);
    setSendError(null);
    try {
      await api(`/messages/${active}/reply`, { body: { text: draft } });
      setDraft("");
      await reload();
    } catch (e) {
      setSendError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <Panel className="max-h-[75dvh] overflow-y-auto p-2">
        {threads.map(([sid, messages]) => {
          const first = messages.find((m) => m.direction === "in") ?? messages[0];
          const unread = messages.some((m) => m.direction === "in" && m.status === "new");
          return (
            <button key={sid} type="button" onClick={() => open(sid, messages)} className={`block w-full rounded-xl p-3 text-start hover:bg-white/10 ${sid === active ? "bg-white/10" : ""}`}>
              <span className="flex items-center justify-between gap-2"><strong>{first.name || "بازدیدکننده"}</strong>{unread && <Badge tone="warn">جدید</Badge>}</span>
              <span className="mt-1 block truncate text-sm text-[var(--dust)]" dir="auto">{messages.at(-1).body}</span>
            </button>
          );
        })}
      </Panel>
      <Panel className="grid min-h-96 content-between gap-3">
        {current ? (
          <>
            <div className="grid max-h-[60dvh] gap-2 overflow-y-auto">
              {current[0].reply_to && <p className="text-sm text-[var(--dust)]">راه تماس: <bdi>{current[0].reply_to}</bdi></p>}
              {current.map((m: any) => (
                <div key={m.id} dir="auto" className={`max-w-[85%] whitespace-pre-wrap rounded-2xl p-3 ${m.direction === "out" ? "justify-self-end bg-[#43d9cf22]" : "justify-self-start bg-white/10"}`}>
                  {m.body}<div className="mt-1 text-xs text-[var(--dust)]">{dateFa(m.created_at)}</div>
                </div>
              ))}
            </div>
            {sendError ? <ErrorNote error={sendError} /> : null}
            <div className="flex gap-2">
              <input className={inputClass} dir="auto" aria-label="متن پاسخ" placeholder="پاسخ در ویجت بازدیدکننده نمایش داده می‌شود" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <Button disabled={busy} onClick={send}>ارسال</Button>
            </div>
          </>
        ) : <Empty>یک گفتگو را از فهرست انتخاب کنید.</Empty>}
      </Panel>
    </div>
  );
}

const COLLAB_STATUS: [string, string][] = [["new", "جدید"], ["reviewing", "در حال بررسی"], ["accepted", "پذیرفته"], ["declined", "رد شده"]];

export function Collab() {
  const { data, error, loading, reload } = useLoad(() => api("/collab"));
  const [saveError, setSaveError] = useState<unknown>(null);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data.requests.length) return <Empty>هنوز درخواست همکاری نرسیده است.</Empty>;

  async function setStatus(id: string, status: string) {
    setSaveError(null);
    try {
      await api(`/collab/${id}`, { method: "PATCH", body: { status } });
      await reload();
    } catch (e) {
      setSaveError(e);
    }
  }

  return (
    <div className="grid gap-3">
      {saveError ? <ErrorNote error={saveError} /> : null}
      {data.requests.map((r: any) => (
        <Panel key={r.id} className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <strong>{r.name} <span className="font-normal text-[var(--dust)]"><bdi>{r.contact}</bdi></span></strong>
            <select aria-label="وضعیت" className={`${inputClass} w-auto`} value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
              {COLLAB_STATUS.map(([value, label]) => <option key={value} value={value} className="text-black">{label}</option>)}
            </select>
          </div>
          <p className="text-sm text-[var(--dust)]">{r.project}، <bdi>{r.skills}</bdi></p>
          <p className="whitespace-pre-wrap" dir="auto">{r.message}</p>
          {r.github_url && <a className="text-sm text-[var(--o-iii)] underline" dir="ltr" href={r.github_url} target="_blank" rel="noopener noreferrer">{r.github_url}</a>}
        </Panel>
      ))}
    </div>
  );
}

function Workflows() {
  const { data, error, loading, reload } = useLoad(() => api("/n8n/workflows"));
  const [busy, setBusy] = useState("");
  const [saveError, setSaveError] = useState<unknown>(null);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data.workflows.length) return <Empty>هنوز گردش‌کاری در n8n ساخته نشده است.</Empty>;

  async function toggle(id: string, active: boolean) {
    setBusy(id);
    setSaveError(null);
    try {
      await api(`/n8n/workflows/${id}/active`, { body: { active } });
      await reload();
    } catch (e) {
      setSaveError(e);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="grid gap-2">
      {saveError ? <ErrorNote error={saveError} /> : null}
      {data.workflows.map((w: any) => (
        <Panel key={w.id} className="flex flex-wrap items-center justify-between gap-3">
          <div><strong dir="auto">{w.name}</strong><p className="text-sm text-[var(--dust)]">{w.nodes.toLocaleString("fa-IR")} نود</p></div>
          <div className="flex items-center gap-3">
            <Badge tone={w.active ? "good" : "neutral"}>{w.active ? "فعال" : "خاموش"}</Badge>
            <Button variant="ghost" disabled={busy === w.id} onClick={() => toggle(w.id, !w.active)}>{w.active ? "خاموش کردن" : "فعال کردن"}</Button>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function Executions() {
  const { data, error, loading, reload } = useLoad(() => api("/n8n/executions"));
  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data.executions.length) return <Empty>هنوز اجرایی ثبت نشده است.</Empty>;
  const tone = (s: string) => (s === "success" ? "good" : s === "error" || s === "crashed" ? "bad" : "neutral");
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-[var(--dust)]"><tr><th className="p-2 text-start">شناسه</th><th className="p-2 text-start">گردش‌کار</th><th className="p-2 text-start">وضعیت</th><th className="p-2 text-start">شروع</th></tr></thead>
        <tbody>{data.executions.map((e: any) => (
          <tr key={e.id} className="border-t border-[var(--glass-line)]"><td className="p-2"><bdi>{e.id}</bdi></td><td className="p-2"><bdi>{e.workflowId}</bdi></td><td className="p-2"><Badge tone={tone(e.status)}>{e.status}</Badge></td><td className="p-2">{e.startedAt ? dateFa(e.startedAt) : ""}</td></tr>
        ))}</tbody>
      </table>
    </Panel>
  );
}

const AUTOMATION_TABS = [["editor", "ادیتور n8n"], ["workflows", "گردش‌کارها"], ["executions", "اجراها"]] as const;

export function Automation() {
  const [tab, setTab] = useState<(typeof AUTOMATION_TABS)[number][0]>("editor");
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" className="flex gap-1">
          {AUTOMATION_TABS.map(([id, label]) => <Button key={id} role="tab" aria-selected={tab === id} variant={tab === id ? "primary" : "ghost"} onClick={() => setTab(id)}>{label}</Button>)}
        </div>
        {N8N_EDITOR_URL && <a className="text-sm text-[var(--o-iii)] underline" href={N8N_EDITOR_URL} target="_blank" rel="noopener noreferrer">باز کردن در تب جدا</a>}
      </div>
      {tab === "editor" && (N8N_EDITOR_URL ? (
        <>
          <iframe title="ادیتور n8n" src={N8N_EDITOR_URL} allow="clipboard-read; clipboard-write" className="h-[calc(100dvh-11rem)] w-full rounded-2xl border border-[var(--glass-line)] bg-white" />
          <p className="text-sm text-[var(--dust)]">اگر این قاب خالی ماند یا ورود انجام نشد، مرورگر کوکی بین‌سایتی را بسته است؛ ادیتور را در تب جدا باز کنید.</p>
        </>
      ) : <Empty>ادیتور هنوز وصل نشده است. n8n را طبق infra/n8n/README.md بالا بیاورید و PUBLIC_N8N_EDITOR_URL را تنظیم کنید.</Empty>)}
      {tab === "workflows" && <Workflows />}
      {tab === "executions" && <Executions />}
    </div>
  );
}
