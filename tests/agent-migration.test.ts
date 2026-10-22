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
    expect(sql).toContain('agent_leads_aged_pending_idx');
    expect(sql).toContain("where status = 'pending'");
  });
});

describe('agent exact rolling-window migration', () => {
  it('serializes count-and-insert and counts only events inside the requested trailing window', () => {
    expect(limitSql).toContain('pg_advisory_xact_lock');
    expect(limitSql.indexOf('pg_advisory_xact_lock')).toBeLessThan(limitSql.indexOf('select pg_catalog.count(*)'));
    expect(limitSql.indexOf('pg_advisory_xact_lock')).toBeLessThan(limitSql.indexOf('v_now := pg_catalog.clock_timestamp()'));
    expect(limitSql.indexOf('v_now := pg_catalog.clock_timestamp()')).toBeLessThan(limitSql.indexOf('v_cutoff := v_now'));
    expect(limitSql.indexOf('select pg_catalog.count(*)')).toBeLessThan(limitSql.indexOf('insert into public.agent_rate_events'));
    expect(limitSql).toContain('e.occurred_at >= v_cutoff');
    expect(limitSql).toContain('if v_count >= p_limit');
    expect(limitSql).not.toContain('tokens');
    expect(limitSql).not.toContain('last_refill');
  });

  it('globally prunes events strictly older than 24 hours through a time-only index', () => {
    expect(limitSql).toContain('agent_rate_events_occurred_at_idx');
    expect(limitSql).toContain('on public.agent_rate_events (occurred_at)');
    expect(limitSql).toContain('v_prune_now := pg_catalog.clock_timestamp()');
    const prune = limitSql.indexOf('e.occurred_at < v_prune_now - pg_catalog.make_interval(secs => 86400)');
    const lock = limitSql.indexOf('pg_advisory_xact_lock');
    const capClock = limitSql.indexOf('v_now := pg_catalog.clock_timestamp()');
    expect(prune).toBeGreaterThan(limitSql.indexOf('v_prune_now := pg_catalog.clock_timestamp()'));
    expect(prune).toBeLessThan(lock);
    expect(lock).toBeLessThan(capClock);
    expect(capClock).toBeLessThan(limitSql.indexOf('select pg_catalog.count(*)'));

    const now = 200_000;
    const events = [now - 86_401, now - 86_400, now - 3_600, now];
    expect(events.filter((at) => at >= now - 86_400)).toEqual([now - 86_400, now - 3_600, now]);
  });

  it('pins skip-locked deletes next to both prune predicates (behavior itself needs a database)', () => {
    expect(limitSql.match(/for update skip locked/g)).toHaveLength(2);
    const prune = limitSql.indexOf('e.occurred_at < v_prune_now - pg_catalog.make_interval(secs => 86400)');
    const scoped = limitSql.indexOf('and e.occurred_at < v_cutoff');
    for (const at of [prune, scoped]) {
      expect(at).toBeGreaterThan(-1);
      expect(limitSql.indexOf('for update skip locked', at) - at).toBeLessThan(120);
    }
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

describe('agent consent-per-phone migration', () => {
  const consentSql = readFileSync('supabase/migrations/2026-10-24-agent-consent-per-phone.sql', 'utf8').toLowerCase();
  const fnOf = (text: string) => text.slice(text.indexOf('create or replace function public.consume_agent_limit'));
  const phoneCase = "    when p_key like 'estimate:phone:%' then\n      v_expected_limit := 1;\n      v_expected_window := 86400;\n";

  it('pins one consent route per phone per trailing day', () => {
    expect(consentSql).toContain(phoneCase);
  });

  it('keeps every earlier cap, the lock and the grants exactly as 2026-10-23', () => {
    // The only difference from the previous function is the new pinned key.
    expect(fnOf(consentSql).replace(phoneCase, '')).toBe(fnOf(limitSql));
  });

  it('matches the caller limit, so the endpoint and SQL cannot drift', async () => {
    const { LIMITS } = await import('../src/lib/agent-facts');
    expect(LIMITS.estimate.consentPerPhonePerDay).toBe(1);
    expect(LIMITS.dayWindowSeconds).toBe(86400);
  });
});
