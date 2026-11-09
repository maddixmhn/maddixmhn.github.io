import { useEffect, useRef, useState, type FormEvent } from "react";
import { copy, type Lang } from "../content";
import { API_URL } from "../lib/config";

interface Entry { mine: boolean; body: string; at?: string }
type Tab = "message" | "ask";

function storedSid(): string {
  try {
    const existing = localStorage.getItem("chat-sid");
    if (existing) return existing;
  } catch { /* private window: this visit gets a temporary id */ }
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const sid = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  try { localStorage.setItem("chat-sid", sid); } catch { /* ignored */ }
  return sid;
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json();
  if (!res.ok || data.ok !== true) throw new Error(data.error);
  return data;
}

export default function ChatWidget({ lang }: { lang: Lang }) {
  const t = copy[lang].chat;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("message");
  const [log, setLog] = useState<Record<Tab, Entry[]>>({ message: [], ask: [] });
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const sid = useRef("");
  const since = useRef(new Date(0).toISOString());
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [log, tab, open]);

  useEffect(() => {
    if (!open || !API_URL) return;
    sid.current ||= storedSid();
    let stopped = false;
    async function poll() {
      try {
        const res = await fetch(`${API_URL}/v1/contact/${sid.current}/replies?since=${encodeURIComponent(since.current)}`);
        const data = await res.json();
        if (stopped || !data.replies?.length) return;
        since.current = data.replies[data.replies.length - 1].at;
        setLog((l) => ({ ...l, message: [...l.message, ...data.replies.map((r: Entry) => ({ mine: false, body: r.body, at: r.at }))] }));
      } catch { /* the next tick retries */ }
    }
    poll();
    const timer = setInterval(() => { if (!document.hidden) poll(); }, 8000);
    return () => { stopped = true; clearInterval(timer); };
  }, [open]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (text.length < 2 || busy) return;
    setBusy(true);
    setStatus("");
    const next = [...log[tab], { mine: true, body: text }];
    setLog((l) => ({ ...l, [tab]: next }));
    setDraft("");
    try {
      if (tab === "message") {
        await post("/v1/contact", { sid: sid.current, message: text, name, reply, lang, page: location.pathname });
        setStatus(t.sent);
      } else {
        const history = next.slice(-8).map((e) => ({ role: e.mine ? "user" : "assistant", content: e.body }));
        const data = await post("/v1/chat", { messages: history, lang });
        setLog((l) => ({ ...l, ask: [...l.ask, { mine: false, body: data.reply }] }));
      }
    } catch {
      setLog((l) => ({ ...l, [tab]: l[tab].slice(0, -1) }));
      setDraft(text);
      setStatus(tab === "ask" ? t.noAi : t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat">
      {open && (
        <div className="chat-panel" role="dialog" aria-label={t.message}>
          {API_URL ? (
            <>
              <div className="chat-tabs" role="tablist">
                {(["message", "ask"] as Tab[]).map((id) => (
                  <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => { setTab(id); setStatus(""); }}>
                    {id === "message" ? t.message : t.ask}
                  </button>
                ))}
              </div>
              <div className="chat-log" data-lenis-prevent>
                <p className="chat-hint">{tab === "message" ? t.messageHint : t.askHint}</p>
                {log[tab].map((entry, i) => <div key={i} dir="auto" className={entry.mine ? "bubble mine" : "bubble"}>{entry.body}</div>)}
                <div ref={end} />
              </div>
              <form className="chat-form" onSubmit={send}>
                {tab === "message" && (
                  <div className="chat-meta">
                    <input className="chat-input" aria-label={t.name} placeholder={t.name} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
                    <input className="chat-input" aria-label={t.reply} placeholder={t.reply} value={reply} maxLength={200} dir="auto" onChange={(e) => setReply(e.target.value)} />
                  </div>
                )}
                <div className="chat-send">
                  <input className="chat-input" aria-label={t.input} placeholder={t.input} value={draft} maxLength={tab === "ask" ? 1200 : 4000} dir="auto" onChange={(e) => setDraft(e.target.value)} />
                  <button className="btn" type="submit" disabled={busy}>{t.send}</button>
                </div>
                <p className="chat-hint" role="status" aria-live="polite">{status}</p>
              </form>
            </>
          ) : <div className="chat-log"><p className="chat-hint">{t.offline}</p></div>}
        </div>
      )}
      <button className="chat-toggle" type="button" aria-expanded={open} aria-label={open ? t.close : t.open} onClick={() => setOpen(!open)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M21 12a8 8 0 0 1-11.6 7.2L4 20l.9-5A8 8 0 1 1 21 12Z" />}
        </svg>
      </button>
    </div>
  );
}
