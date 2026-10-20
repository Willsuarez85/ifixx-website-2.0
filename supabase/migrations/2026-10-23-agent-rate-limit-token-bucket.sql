-- Continuous token buckets replace fixed clock windows for the public agent endpoints.
-- A full bucket permits the documented burst; capacity refills evenly across the period,
-- so crossing an hour/day boundary cannot immediately reset a caller's allowance.

create table if not exists public.agent_rate_buckets (
  site text not null,
  key text not null,
  tokens double precision not null,
  last_refill timestamptz not null,
  primary key (site, key),
  constraint agent_rate_buckets_tokens_nonnegative check (tokens >= 0)
);

alter table public.agent_rate_buckets enable row level security;
revoke all on public.agent_rate_buckets from public, anon, authenticated;
grant select, insert, update on public.agent_rate_buckets to service_role;

create or replace function public.consume_agent_token(
  p_site text,
  p_key text,
  p_capacity int,
  p_refill_seconds int
)
returns table(allowed boolean, remaining int)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_tokens double precision;
  v_last_refill timestamptz;
begin
  if p_capacity < 1 or p_refill_seconds < 1 then
    raise exception 'capacity and refill seconds must be positive';
  end if;

  insert into public.agent_rate_buckets (site, key, tokens, last_refill)
  values (p_site, p_key, p_capacity::double precision, v_now)
  on conflict (site, key) do nothing;

  select b.tokens, b.last_refill
    into v_tokens, v_last_refill
    from public.agent_rate_buckets as b
   where b.site = p_site and b.key = p_key
   for update;

  v_tokens := least(
    p_capacity::double precision,
    v_tokens + greatest(
      extract(epoch from (v_now - v_last_refill)),
      0
    ) * p_capacity::double precision / p_refill_seconds::double precision
  );

  if v_tokens >= 1 then
    allowed := true;
    v_tokens := v_tokens - 1;
  else
    allowed := false;
  end if;

  update public.agent_rate_buckets as b
     set tokens = v_tokens,
         last_refill = v_now
   where b.site = p_site and b.key = p_key;

  remaining := pg_catalog.floor(v_tokens)::int;
  return next;
end;
$$;

revoke execute on function public.consume_agent_token(text, text, int, int)
  from public, anon, authenticated;
grant execute on function public.consume_agent_token(text, text, int, int)
  to service_role;
