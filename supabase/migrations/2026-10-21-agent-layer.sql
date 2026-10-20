-- AI-agent layer store: rate-limit counters, estimate-request dedup and the
-- conversation log. Shared by every site that runs the agent layer; rows carry `site`
-- (the AGENT_SITE_ID of the deployment). Only the service key reaches these tables:
-- RLS is on with no policies, and bump_counter is executable by service_role only.
-- Idempotent: safe to run twice.

create table if not exists public.agent_counters (
  site text not null,
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (site, key, window_start)
);

create table if not exists public.agent_leads (
  id bigserial primary key,
  site text not null,
  reference text not null,
  phone_hash text not null,
  vendor text,
  conversation_id text,
  contact_id text,
  created_at timestamptz not null default now()
);

create index if not exists agent_leads_site_phone_created_idx
  on public.agent_leads (site, phone_hash, created_at);

create table if not exists public.agent_conversations (
  id bigserial primary key,
  site text not null,
  conversation_id text,
  question text,
  answer text,
  matched_faq text,
  flagged bool,
  violations jsonb,
  model text,
  tokens_in int,
  tokens_out int,
  user_agent text,
  ip_hash text,
  degraded bool,
  created_at timestamptz not null default now()
);

create index if not exists agent_conversations_site_created_idx
  on public.agent_conversations (site, created_at);

alter table public.agent_counters enable row level security;
alter table public.agent_leads enable row level security;
alter table public.agent_conversations enable row level security;

-- Adds one to the counter of (site, key) in the current fixed window and returns the
-- new count. The window starts at a multiple of p_window_seconds since the epoch.
create or replace function public.bump_counter(p_site text, p_key text, p_window_seconds int)
returns int
language sql
volatile
set search_path = public
as $$
  insert into public.agent_counters (site, key, window_start, count)
  values (
    p_site,
    p_key,
    to_timestamp(floor(extract(epoch from now()) / greatest(p_window_seconds, 1)) * greatest(p_window_seconds, 1)),
    1
  )
  on conflict (site, key, window_start) do update set count = agent_counters.count + 1
  returning count;
$$;

revoke execute on function public.bump_counter(text, text, int) from public, anon, authenticated;
grant execute on function public.bump_counter(text, text, int) to service_role;
