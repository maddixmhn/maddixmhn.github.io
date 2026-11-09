import { useState } from "react";
import SpotlightCard from "../components/bits/SpotlightCard";
import { api } from "./api";
import { Badge, Button, dateFa, Empty, ErrorNote, Field, inputClass, Loading, Panel, useLoad } from "./ui";

const fa = (n: unknown) => Number(n ?? 0).toLocaleString("fa-IR");
const GLASS = { "--spotlight-card-surface": "rgb(255 255 255 / 0.06)", "--spotlight-card-border": "rgb(255 255 255 / 0.14)", "--spotlight-card-shadow": "none" } as React.CSSProperties;

export function Tile({ value, label, tint = "#43d9cf" }: { value: unknown; label: string; tint?: string }) {
  return (
    <SpotlightCard className="!rounded-2xl !p-4" style={GLASS} spotlightColor={tint}>
      <p className="text-4xl font-bold">{typeof value === "number" ? fa(value) : String(value)}</p>
      <p className="mt-1 text-sm text-[var(--dust)]">{label}</p>
    </SpotlightCard>
  );
}

const MAP: { title: string; nodes: [string, string?][] }[] = [
  { title: "ورودی‌ها", nodes: [["سایت و ویجت چت"], ["فرم همکاری"], ["ربات تلگرام", "telegram"]] },
  { title: "هسته", nodes: [["API روی Worker"], ["Supabase"], ["گاوصندوق کلیدها", "elonVault"]] },
  { title: "مغز", nodes: [["ELON OS"], ["دستیار سایت", "assistant"]] },
  { title: "اجرا", nodes: [["گردش‌کارهای n8n", "n8n"], ["رویدادهای n8n", "n8nEvents"], ["سازمان‌های Paperclip", "paperclip"]] },
];

/** Shows how every part hands work to the next, and which links still need setting up. */
export function SystemMap({ services }: { services: Record<string, boolean> }) {
  return (
    <Panel>
      <h2 className="mb-3 font-semibold">نقشهٔ اتصال</h2>
      <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-4">
        {MAP.map((column, i) => (
          <li key={column.title} className="relative rounded-xl bg-white/5 p-3">
            <h3 className="mb-2 text-sm text-[var(--dust)]">{column.title}</h3>
            <ul className="m-0 grid list-none gap-2 p-0">
              {column.nodes.map(([label, key]) => {
                const on = key ? services[key] : true;
                return (
                  <li key={label} className="flex items-center gap-2 text-sm">
                    <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${on ? "bg-[var(--o-iii)]" : "bg-[var(--s-ii)]"}`} />
                    {label}
                    {!on && <span className="sr-only">تنظیم نشده</span>}
                  </li>
                );
              })}
            </ul>
            {i < MAP.length - 1 && <span aria-hidden="true" className="absolute top-1/2 -end-3 z-10 hidden -translate-y-1/2 text-[var(--o-iii)] md:block rtl:rotate-180">&#10140;</span>}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

const TASK_STATUS: Record<string, string> = { todo: "در صف", in_progress: "در حال انجام", in_review: "در بازبینی", blocked: "مسدود", done: "تمام" };

function Company({ org, onRemoved }: { org: any; onRemoved: () => void }) {
  const { data, error, loading, reload } = useLoad(() => api(`/org/${org.id}/overview`), [org.id]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);

  async function create() {
    if (title.trim().length < 2 || description.trim().length < 2) return;
    setBusy(true);
    setActionError(null);
    try {
      await api(`/org/${org.id}/tasks`, { body: { title, description } });
      setTitle("");
      setDescription("");
      await reload();
    } catch (e) {
      setActionError(e);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`اتصال ${org.name} از داشبورد حذف شود؟ خود سازمان در Paperclip می‌ماند.`)) return;
    try {
      await api(`/org/${org.id}`, { method: "DELETE" });
      onRemoved();
    } catch (e) {
      setActionError(e);
    }
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <a className="text-sm text-[var(--o-iii)] underline" href={org.api_url} target="_blank" rel="noopener noreferrer">مدیریت کامل در Paperclip</a>
      <Button variant="danger" onClick={remove}>حذف اتصال</Button>
    </div>
  );

  if (loading && !data) return <Loading />;
  if (error) return <div className="grid gap-3">{header}<ErrorNote error={error} onRetry={reload} /></div>;

  const spent = data.costs?.spendCents ?? data.costs?.spentCents ?? data.costs?.monthSpendCents;
  return (
    <div className="grid gap-4">
      {header}
      {actionError ? <ErrorNote error={actionError} /> : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile value={data.agents.total ?? 0} label="ایجنت" />
        <Tile value={(data.agents.running ?? 0) + (data.agents.active ?? 0)} label="در حال کار" tint="#f5b94c" />
        <Tile value={data.openTasks} label="کار باز" tint="#ff5c7a" />
        <Tile value={spent === undefined ? "نامشخص" : `$${(spent / 100).toFixed(2)}`} label="هزینهٔ این ماه" tint="#8b7bff" />
      </div>
      {data.pendingApprovals ? <Panel className="flex items-center justify-between gap-3"><span>{fa(data.pendingApprovals)} تأیید در Paperclip منتظر شماست.</span><a className="text-[var(--o-iii)] underline" href={org.api_url} target="_blank" rel="noopener noreferrer">بررسی</a></Panel> : null}

      <section>
        <h2 className="mb-2 font-semibold">دپارتمان‌ها</h2>
        {data.departments.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.departments.map((d: any) => (
              <SpotlightCard key={d.id} className="!rounded-2xl !p-4" style={GLASS} spotlightColor="#43d9cf">
                <strong dir="auto">{d.name}</strong>
                <p className="mt-1 text-sm text-[var(--dust)]">{fa(d.total)} ایجنت، {fa(d.running)} در حال کار، {fa(d.paused)} متوقف{d.error ? `، ${fa(d.error)} با خطا` : ""}</p>
              </SpotlightCard>
            ))}
          </div>
        ) : <Empty>هنوز دپارتمانی زیر ELON OS تعریف نشده است. بستهٔ سازمان را طبق infra/paperclip/README.md وارد کنید.</Empty>}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Panel>
          <h2 className="mb-2 font-semibold">کارهای باز</h2>
          {data.tasks.length ? (
            <ul className="m-0 grid list-none gap-2 p-0">
              {data.tasks.map((t: any) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 p-2 text-sm">
                  <span dir="auto" className="min-w-0 truncate">{t.title}</span>
                  <Badge tone={t.status === "blocked" ? "bad" : t.status === "in_progress" ? "good" : "neutral"}>{TASK_STATUS[t.status] ?? t.status}</Badge>
                </li>
              ))}
            </ul>
          ) : <Empty>کار بازی وجود ندارد.</Empty>}
        </Panel>
        <Panel className="grid content-start gap-3">
          <h2 className="font-semibold">کار جدید برای ELON OS</h2>
          <Field label="عنوان"><input className={inputClass} dir="auto" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="شرح کار"><textarea className={`${inputClass} min-h-28`} dir="auto" value={description} maxLength={6000} onChange={(e) => setDescription(e.target.value)} /></Field>
          <Button disabled={busy} onClick={create}>{busy ? "در حال ثبت" : "ثبت کار"}</Button>
        </Panel>
      </div>
    </div>
  );
}

export function Organization() {
  const { data, error, loading, reload } = useLoad(() => api("/org"));
  const [active, setActive] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", apiUrl: "", apiKey: "" });
  const [adding, setAdding] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  async function add() {
    setSaveError(null);
    try {
      await api("/org", { body: form });
      setForm({ name: "", apiUrl: "", apiKey: "" });
      setAdding(false);
      await reload();
    } catch (e) {
      setSaveError(e);
    }
  }

  const orgs = data.orgs as any[];
  const current = orgs.find((o) => o.id === active) ?? orgs[0];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-1" role="tablist">
        {orgs.map((o) => <Button key={o.id} role="tab" aria-selected={o.id === current?.id} variant={o.id === current?.id ? "primary" : "ghost"} onClick={() => setActive(o.id)}>{o.name}</Button>)}
        <Button variant="ghost" onClick={() => setAdding(!adding)}>{adding ? "انصراف" : "افزودن پروژه"}</Button>
      </div>
      {(adding || !orgs.length) && (
        <Panel className="grid gap-3 md:max-w-xl">
          <h2 className="font-semibold">اتصال سازمان یک پروژه</h2>
          <Field label="نام پروژه"><input className={inputClass} dir="auto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="آدرس Paperclip"><input className={inputClass} dir="ltr" placeholder="https://paperclip.example.com" value={form.apiUrl} onChange={(e) => setForm({ ...form, apiUrl: e.target.value })} /></Field>
          <Field label="کلید API ایجنت ELON OS"><input className={inputClass} dir="ltr" type="password" autoComplete="off" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} /></Field>
          {saveError ? <ErrorNote error={saveError} /> : null}
          <Button onClick={add}>بررسی و اتصال</Button>
        </Panel>
      )}
      {current && <Company key={current.id} org={current} onRemoved={() => { setActive(null); reload(); }} />}
    </div>
  );
}

const QUESTIONS = "چه چیزی برایت مهم‌تر است: سرعت یا دقت؟\nوقتی دو راه داری، با چه معیاری انتخاب می‌کنی؟\nچه کارهایی را هرگز بدون خودت انجام ندهد؟\nلحن نوشتنت چطور است؟";

/** The owner writes this; nothing here is inferred or generated for them. */
export function Identity() {
  const { data, error, loading, reload, setData } = useLoad(() => api("/elon/profile"));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  async function save() {
    setSaved(false);
    setSaveError(null);
    try {
      await api("/elon/profile", { method: "PUT", body: { body: data.body } });
      setSaved(true);
    } catch (e) {
      setSaveError(e);
    }
  }

  return (
    <Panel className="grid gap-3">
      <p className="text-[var(--dust)]">ELON OS هر تصمیم را با این متن می‌سنجد. هرچه دقیق‌تر بنویسی، تصمیم‌هایش به تو نزدیک‌تر می‌شود.</p>
      <textarea aria-label="هویت ELON OS" className={`${inputClass} min-h-80`} dir="auto" placeholder={QUESTIONS} value={data.body} maxLength={20000} onChange={(e) => { setSaved(false); setData({ ...data, body: e.target.value }); }} />
      {saveError ? <ErrorNote error={saveError} /> : null}
      <div className="flex items-center gap-3">
        <Button onClick={save}>ذخیره</Button>
        <span role="status" className="text-sm text-[var(--o-iii)]">{saved ? `ذخیره شد، ${dateFa(new Date().toISOString())}` : ""}</span>
      </div>
    </Panel>
  );
}
