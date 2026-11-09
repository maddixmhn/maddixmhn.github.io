-- Platform schema. The browser never talks to these tables: every read and
-- write goes through the Worker with the service key, so RLS is enabled with
-- no policies and the anon/authenticated roles have no grants.

create extension if not exists pgcrypto;

create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  sid           text not null,
  direction     text not null default 'in' check (direction in ('in', 'out')),
  name          text,
  reply_to      text,
  body          text not null,
  lang          text,
  page          text,
  status        text not null default 'new' check (status in ('new', 'read', 'archived')),
  tg_message_id bigint,
  created_at    timestamptz not null default now()
);
create index messages_sid_created_idx on public.messages (sid, created_at);
create index messages_status_created_idx on public.messages (status, created_at desc);
create index messages_tg_idx on public.messages (tg_message_id) where tg_message_id is not null;

create table public.collab_requests (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact       text not null,
  github_url    text,
  skills        text not null,
  project       text not null,
  message       text not null,
  lang          text,
  status        text not null default 'new'
                check (status in ('new', 'reviewing', 'accepted', 'declined')),
  tg_message_id bigint,
  created_at    timestamptz not null default now()
);
create index collab_status_created_idx on public.collab_requests (status, created_at desc);

create table public.elon_providers (
  id          text primary key,
  label       text not null,
  base_url    text not null,
  model       text not null,
  api_key_enc text not null,
  is_default  boolean not null default false,
  updated_at  timestamptz not null default now()
);
create unique index elon_one_default_provider on public.elon_providers (is_default) where is_default;

create table public.elon_mcp_servers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  url             text not null,
  auth_header_enc text,
  enabled         boolean not null default true,
  created_at      timestamptz not null default now()
);

create table public.elon_runs (
  id          uuid primary key default gen_random_uuid(),
  status      text not null check (status in ('running', 'awaiting_approval', 'done', 'error')),
  provider_id text,
  title       text,
  messages    jsonb not null default '[]'::jsonb,
  pending     jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index elon_runs_updated_idx on public.elon_runs (updated_at desc);

create table public.elon_audit (
  id         bigint generated always as identity primary key,
  run_id     uuid references public.elon_runs (id) on delete set null,
  tool       text not null,
  args       jsonb,
  decision   text not null check (decision in ('auto', 'approved', 'denied')),
  ok         boolean,
  result     text,
  created_at timestamptz not null default now()
);
create index elon_audit_run_idx on public.elon_audit (run_id, id);

do $$
declare t text;
begin
  foreach t in array array[
    'messages', 'collab_requests', 'elon_providers',
    'elon_mcp_servers', 'elon_runs', 'elon_audit'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
