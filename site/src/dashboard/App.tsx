import type { Session } from "@supabase/supabase-js";
import { useEffect, useState, type FormEvent } from "react";
import { configured, supabase } from "./api";
import { ELON } from "./elon";
import { Organization } from "./org";
import { Button, Field, inputClass, Panel } from "./ui";
import { Automation, Collab, Inbox, Overview } from "./views";

const ROUTES = [
  { id: "overview", label: "نمای کلی", view: Overview },
  { id: "inbox", label: "پیام‌ها", view: Inbox },
  { id: "collab", label: "همکاری", view: Collab },
  { id: "automation", label: "اتوماسیون", view: Automation },
  { id: "elon", label: "ELON OS", view: ELON },
  { id: "org", label: "سازمان ایجنت‌ها", view: Organization },
];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { error: failure } = await supabase!.auth.signInWithPassword({ email, password });
    if (failure) setError(failure.status === 400 ? "ایمیل یا رمز عبور درست نیست." : "ارتباط با سرویس ورود برقرار نشد.");
    setBusy(false);
  }

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <Panel className="w-full max-w-sm">
        <h1 className="mb-4 text-2xl font-bold">ورود به داشبورد</h1>
        <form className="grid gap-3" onSubmit={submit}>
          <Field label="ایمیل"><input className={inputClass} dir="ltr" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="رمز عبور"><input className={inputClass} dir="ltr" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {error && <p role="alert" className="text-sm text-[#ffb0be]">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? "در حال ورود" : "ورود"}</Button>
        </form>
      </Panel>
    </main>
  );
}

function Setup() {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <Panel className="max-w-lg">
        <h1 className="mb-2 text-2xl font-bold">داشبورد هنوز وصل نشده است</h1>
        <p className="text-[var(--dust)]">متغیرهای PUBLIC_API_URL، PUBLIC_SUPABASE_URL و PUBLIC_SUPABASE_PUBLISHABLE_KEY را طبق docs/DEPLOY.md تنظیم کنید و سایت را دوباره بسازید.</p>
      </Panel>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [route, setRoute] = useState(() => location.hash.slice(1) || "overview");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(location.hash.slice(1) || "overview");
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  if (!configured) return <Setup />;
  if (session === undefined) return <p role="status" className="p-8 text-center text-[var(--dust)]">در حال بارگذاری</p>;
  if (!session) return <Login />;

  const current = ROUTES.find((r) => r.id === route) ?? ROUTES[0]!;
  const View = current.view;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[14rem_1fr]">
      <aside className="sticky top-0 z-10 flex items-center gap-1 overflow-x-auto border-b border-[var(--glass-line)] bg-[#10143899] p-2 backdrop-blur-xl lg:h-dvh lg:flex-col lg:items-stretch lg:border-b-0 lg:border-e lg:p-4">
        <a href="/" className="hidden px-3 pb-4 text-xl font-bold no-underline lg:block" dir="ltr">maddix</a>
        <nav className="flex gap-1 lg:grid" aria-label="بخش‌های داشبورد">
          {ROUTES.map((r) => (
            <a key={r.id} href={`#${r.id}`} aria-current={r.id === current.id ? "page" : undefined} className={`whitespace-nowrap rounded-xl px-3 py-2 no-underline ${r.id === current.id ? "bg-white/15" : "text-[var(--dust)] hover:bg-white/10"}`}>{r.label}</a>
          ))}
        </nav>
        <Button variant="ghost" className="ms-auto lg:ms-0 lg:mt-auto" onClick={() => supabase!.auth.signOut()}>خروج</Button>
      </aside>
      <main className="min-w-0 p-3 lg:p-6">
        <h1 className="mb-4 text-3xl font-bold">{current.label}</h1>
        <View key={current.id} />
      </main>
    </div>
  );
}
