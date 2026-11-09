# Agent notes

The roadmap and reuse decisions live in `docs/ROADMAP.md`; go-live steps are in `docs/DEPLOY.md`.

- `site/` is the new Astro site, `worker/` the Cloudflare API, `supabase/` the schema, `infra/n8n/` the self-hosted editor.
- The repository root is still the live legacy site until `.github/workflows/static.yml` is switched to `site/dist`.
- Secrets belong in Worker secrets only. Anything named `PUBLIC_*` ships to browsers.
- Split Persian text by word, never by letter. Set `lang` and `dir`, and isolate LTR fragments.
- The Supabase project `drkimiahabibi-db` belongs to a client. Do not use it for this platform.
- ELON tools that act outside an agent organization or change a live system stay behind the approval gate. Tools that only touch tasks inside a connected Paperclip company run without a pause and are audited.
