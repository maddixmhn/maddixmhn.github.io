-- Agent organizations run in Paperclip; ELON OS keeps only how to reach each one
-- and the owner's written identity. Same access model as the first migration.

create table public.elon_orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  api_url     text not null,
  api_key_enc text not null,
  company_id  text not null,
  agent_id    text not null unique,
  created_at  timestamptz not null default now()
);

create table public.elon_profile (
  id         int primary key default 1 check (id = 1),
  body       text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.elon_orgs enable row level security;
alter table public.elon_profile enable row level security;
revoke all on public.elon_orgs from anon, authenticated;
revoke all on public.elon_profile from anon, authenticated;
