import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/2026-10-22-agent-estimate-hardening.sql', 'utf8').toLowerCase();
const bucketSql = readFileSync('supabase/migrations/2026-10-23-agent-rate-limit-token-bucket.sql', 'utf8').toLowerCase();

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

describe('agent token-bucket migration', () => {
  it('locks one bucket row and refills continuously instead of resetting on clock boundaries', () => {
    expect(bucketSql).toContain('for update');
    expect(bucketSql).toContain('last_refill');
    expect(bucketSql).toContain('extract(epoch from (v_now - v_last_refill))');
    expect(bucketSql).toContain('v_tokens := v_tokens - 1');
    expect(bucketSql).not.toContain('window_start');
  });

  it('keeps the RPC invoker-scoped with an empty search path and service-only execution', () => {
    expect(bucketSql).toContain('security invoker');
    expect(bucketSql).toContain("set search_path = ''");
    expect(bucketSql).toContain('from public, anon, authenticated');
    expect(bucketSql).toContain('to service_role');
    expect(bucketSql).not.toContain('security definer');
  });
});
