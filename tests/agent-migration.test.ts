import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/2026-10-22-agent-estimate-hardening.sql', 'utf8').toLowerCase();
const limitSql = readFileSync('supabase/migrations/2026-10-23-agent-rate-limit-rolling-window.sql', 'utf8').toLowerCase();

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

  it('returns the persisted routing state and indexes incomplete routing as a durable manual outbox', () => {
    expect(sql).toContain('routing_status text');
    expect(sql).toContain('existing_routing_status');
    expect(sql).toContain('agent_leads_incomplete_routing_idx');
    expect(sql).toContain("where status = 'completed' and routing_status = 'incomplete'");
  });
});

describe('agent exact rolling-window migration', () => {
  it('serializes count-and-insert and counts only events inside the requested trailing window', () => {
    expect(limitSql).toContain('pg_advisory_xact_lock');
    expect(limitSql.indexOf('pg_advisory_xact_lock')).toBeLessThan(limitSql.indexOf('select pg_catalog.count(*)'));
    expect(limitSql.indexOf('pg_advisory_xact_lock')).toBeLessThan(limitSql.indexOf('v_now := pg_catalog.clock_timestamp()'));
    expect(limitSql.indexOf('select pg_catalog.count(*)')).toBeLessThan(limitSql.indexOf('insert into public.agent_rate_events'));
    expect(limitSql).toContain('e.occurred_at >= v_cutoff');
    expect(limitSql).toContain('if v_count >= p_limit');
    expect(limitSql).not.toContain('tokens');
    expect(limitSql).not.toContain('last_refill');
  });

  it('pins all four hard caps inside SQL rather than trusting caller-supplied limits', () => {
    for (const expected of [
      "when p_key like 'estimate:ip:%' then\n      v_expected_limit := 5;\n      v_expected_window := 3600;",
      "when p_key = 'estimate:day' then\n      v_expected_limit := 50;\n      v_expected_window := 86400;",
      "when p_key like 'ask:ip:%' then\n      v_expected_limit := 20;\n      v_expected_window := 3600;",
      "when p_key = 'ask:day' then\n      v_expected_limit := 500;\n      v_expected_window := 86400;",
    ]) expect(limitSql).toContain(expected);
  });

  it('has exact hard-cap boundary semantics in the reference model', () => {
    const consume = (events: number[], now: number, limit: number, window: number) => {
      const active = events.filter((at) => at >= now - window);
      return active.length >= limit
        ? { allowed: false, events: active }
        : { allowed: true, events: [...active, now] };
    };
    for (const [limit, window] of [[5, 3600], [50, 86400], [20, 3600], [500, 86400]]) {
      let events: number[] = [];
      for (let i = 0; i < limit; i++) {
        const result = consume(events, 100_000, limit, window);
        expect(result.allowed).toBe(true);
        events = result.events;
      }
      expect(consume(events, 100_000, limit, window).allowed).toBe(false);
      expect(consume(events, 100_000 + window, limit, window).allowed).toBe(false);
      expect(consume(events, 100_001 + window, limit, window).allowed).toBe(true);
    }
  });

  it('keeps the RPC invoker-scoped with an empty search path and service-only execution', () => {
    expect(limitSql).toContain('security invoker');
    expect(limitSql).toContain("set search_path = ''");
    expect(limitSql).toContain('from public, anon, authenticated');
    expect(limitSql).toContain('to service_role');
    expect(limitSql).not.toContain('security definer');
  });
});
