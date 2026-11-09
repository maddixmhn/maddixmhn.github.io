import { useState, type FormEvent } from "react";
import { copy, type Lang } from "../content";
import { API_URL } from "../lib/config";

type State = "idle" | "busy" | "ok" | "error";

export default function CollabForm({ lang }: { lang: Lang }) {
  const t = copy[lang].join;
  const [state, setState] = useState<State>("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "busy") return;
    const form = event.currentTarget;
    setState("busy");
    try {
      const res = await fetch(`${API_URL}/v1/collab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), lang }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (!res.ok || data.ok !== true) throw new Error(data.error);
      form.reset();
      setState("ok");
    } catch {
      setState("error");
    }
  }

  if (!API_URL) return <p className="form status">{t.unavailable}</p>;

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-row">
        <label className="field">{t.name}<input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
        <label className="field">{t.contact}<input name="contact" required minLength={3} maxLength={200} dir="ltr" autoComplete="email" /></label>
      </div>
      <div className="form-row">
        <label className="field">{t.github}<input name="github" type="url" maxLength={200} dir="ltr" placeholder="https://github.com/" /></label>
        <label className="field">{t.project}
          <select name="project" required defaultValue={t.projects[0]}>{t.projects.map((p) => <option key={p}>{p}</option>)}</select>
        </label>
      </div>
      <label className="field">{t.skills}<input name="skills" required minLength={2} maxLength={400} /></label>
      <label className="field">{t.message}<textarea name="message" required minLength={10} maxLength={3000} /></label>
      <label className="trap" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <button className="btn" type="submit" disabled={state === "busy"}>{state === "busy" ? t.sending : t.submit}</button>
      <p className="status" role="status" aria-live="polite" data-kind={state}>
        {state === "ok" ? t.sent : state === "error" ? t.failed : ""}
      </p>
    </form>
  );
}
