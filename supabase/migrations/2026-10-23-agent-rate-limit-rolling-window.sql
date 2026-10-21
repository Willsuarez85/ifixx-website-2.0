-- Exact rolling-window hard caps for the public agent endpoints. Each accepted
-- request writes one event. A transaction-scoped advisory lock serializes the
-- count-and-insert operation for a site/key pair, including an empty bucket.

create table if not exists public.agent_rate_events (
  site text not null,
  key text not null,
  occurred_at timestamptz not null default now()
);

create index if not exists agent_rate_events_scope_time_idx
  on public.agent_rate_events (site, key, occurred_at desc);

create index if not exists agent_rate_events_occurred_at_idx
  on public.agent_rate_events (occurred_at);

alter table public.agent_rate_events enable row level security;
revoke all on public.agent_rate_events from public, anon, authenticated;
grant select, insert, delete on public.agent_rate_events to service_role;

create or replace function public.consume_agent_limit(
  p_site text,
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns table(allowed boolean, remaining int)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_prune_now timestamptz;
  v_now timestamptz;
  v_cutoff timestamptz;
  v_count int;
  v_expected_limit int;
  v_expected_window int;
begin
  case
    when p_key like 'estimate:ip:%' then
      v_expected_limit := 5;
      v_expected_window := 3600;
    when p_key = 'estimate:day' then
      v_expected_limit := 50;
      v_expected_window := 86400;
    when p_key like 'ask:ip:%' then
      v_expected_limit := 20;
      v_expected_window := 3600;
    when p_key = 'ask:day' then
      v_expected_limit := 500;
      v_expected_window := 86400;
    else
      raise exception 'unknown agent limit key';
  end case;

  if p_limit <> v_expected_limit or p_window_seconds <> v_expected_window then
    raise exception 'agent limit configuration mismatch';
  end if;

  -- Globally prune one-shot keys after the longest enforced window. The strict less-
  -- than boundary preserves events exactly 24 hours old for the daily hard cap. Its
  -- timestamp is taken before the per-key lock, so the cap clock below is never older
  -- than the prune cutoff.
  v_prune_now := pg_catalog.clock_timestamp();
  -- Rows another transaction is already deleting are skipped, never waited on. A caller
  -- that holds row locks from this prune while queuing for the advisory lock below must
  -- not be waited on by the lock holder's own deletes, or the two would deadlock.
  delete from public.agent_rate_events as d
   where d.ctid in (
     select e.ctid
       from public.agent_rate_events as e
      where e.occurred_at < v_prune_now - pg_catalog.make_interval(secs => 86400)
        for update skip locked
   );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('agent-limit:' || p_site || ':' || p_key, 0)
  );

  -- Take the cap timestamp only after every possible wait. This ensures a newly
  -- inserted event receives its full rolling-window lifetime.
  v_now := pg_catalog.clock_timestamp();
  v_cutoff := v_now - pg_catalog.make_interval(secs => p_window_seconds);

  -- The global prune leaves hour-old events for daily keys, so trim this active scope
  -- to its own exact cutoff before counting it.
  delete from public.agent_rate_events as d
   where d.ctid in (
     select e.ctid
       from public.agent_rate_events as e
      where e.site = p_site
        and e.key = p_key
        and e.occurred_at < v_cutoff
        for update skip locked
   );

  select pg_catalog.count(*)::int
    into v_count
    from public.agent_rate_events as e
   where e.site = p_site
     and e.key = p_key
     and e.occurred_at >= v_cutoff;

  if v_count >= p_limit then
    return query select false, 0;
    return;
  end if;

  insert into public.agent_rate_events (site, key, occurred_at)
  values (p_site, p_key, v_now);

  return query select true, p_limit - v_count - 1;
end;
$$;

revoke execute on function public.consume_agent_limit(text, text, int, int)
  from public, anon, authenticated;
grant execute on function public.consume_agent_limit(text, text, int, int)
  to service_role;
