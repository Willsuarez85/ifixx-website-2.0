-- Atomic, payload-bound reservation for the public estimate endpoint. This follows the
-- original agent-layer migration, which may already be deployed. The service role is
-- the only caller; client roles keep no table or function access.

alter table public.agent_leads
  add column if not exists payload_hash text,
  add column if not exists status text not null default 'completed',
  add column if not exists completed_at timestamptz,
  add column if not exists routing_status text not null default 'complete';

create index if not exists agent_leads_site_payload_created_idx
  on public.agent_leads (site, payload_hash, created_at desc)
  where payload_hash is not null;

create or replace function public.reserve_agent_estimate(
  p_site text,
  p_payload_hash text,
  p_phone_hash text,
  p_reference text,
  p_window_seconds int,
  p_vendor text default null,
  p_conversation_id text default null
)
returns table(acquired boolean, reference text, reservation_status text)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  existing_reference text;
  existing_status text;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_site || ':' || p_payload_hash, 0)
  );

  select l.reference, l.status
    into existing_reference, existing_status
    from public.agent_leads as l
   where l.site = p_site
     and l.payload_hash = p_payload_hash
     and l.status in ('pending', 'completed')
     and l.created_at >= pg_catalog.now() - pg_catalog.make_interval(secs => greatest(p_window_seconds, 1))
   order by l.created_at desc
   limit 1;

  if existing_reference is not null then
    return query select false, existing_reference, existing_status;
    return;
  end if;

  insert into public.agent_leads (
    site, reference, phone_hash, payload_hash, vendor, conversation_id, status
  ) values (
    p_site, p_reference, p_phone_hash, p_payload_hash, p_vendor, p_conversation_id, 'pending'
  );

  return query select true, p_reference, 'pending'::text;
end;
$$;

create or replace function public.complete_agent_estimate(
  p_site text,
  p_payload_hash text,
  p_reference text,
  p_contact_id text,
  p_routing_status text
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  update public.agent_leads as l
     set contact_id = p_contact_id,
         status = 'completed',
         routing_status = p_routing_status,
         completed_at = pg_catalog.now()
   where l.site = p_site
     and l.payload_hash = p_payload_hash
     and l.reference = p_reference
     and l.status = 'pending';
  return found;
end;
$$;

create or replace function public.release_agent_estimate(
  p_site text,
  p_payload_hash text,
  p_reference text
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  delete from public.agent_leads as l
   where l.site = p_site
     and l.payload_hash = p_payload_hash
     and l.reference = p_reference
     and l.status = 'pending';
  return found;
end;
$$;

revoke execute on function public.reserve_agent_estimate(text, text, text, text, int, text, text)
  from public, anon, authenticated;
revoke execute on function public.complete_agent_estimate(text, text, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.release_agent_estimate(text, text, text)
  from public, anon, authenticated;

grant execute on function public.reserve_agent_estimate(text, text, text, text, int, text, text)
  to service_role;
grant execute on function public.complete_agent_estimate(text, text, text, text, text)
  to service_role;
grant execute on function public.release_agent_estimate(text, text, text)
  to service_role;
