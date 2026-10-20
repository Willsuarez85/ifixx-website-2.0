import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/2026-10-22-agent-estimate-hardening.sql', 'utf8').toLowerCase();

describe('agent estimate hardening migration', () => {
  it('uses a transaction-scoped advisory lock before inserting the reservation', () => {
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql.indexOf('pg_advisory_xact_lock')).toBeLessThan(sql.indexOf("insert into public.agent_leads"));
    expect(sql).toContain('p_payload_hash');
  });

  it('keeps every RPC invoker-scoped, with an empty search path and service-only execution', () => {
    expect(sql.match(/security invoker/g)).toHaveLength(3);
    expect(sql.match(/set search_path = ''/g)).toHaveLength(3);
    expect(sql.match(/from public, anon, authenticated/g)).toHaveLength(3);
    expect(sql.match(/to service_role/g)).toHaveLength(3);
    expect(sql).not.toContain('security definer');
  });
});
