import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIContext } from 'astro';
import { POST, OPTIONS } from '../src/pages/api/agent/estimate';
import { GET as GET_API, OPTIONS as OPTIONS_API } from '../src/pages/api/agent/index';
import { AGENT_SERVICE_KEYS, BRAND } from '../src/lib/agent-facts';

const STORE = 'https://store.test';
const GHL = 'https://services.leadconnectorhq.com';
// Open opportunity in the Ifixx 2026 pipeline: routing returns at once, no retries or waits.
const OUTDOOR_OPEN = { opportunities: [{ id: 'o1', pipelineId: 'QlQ4FGiqHYUgMAUwxjb1', status: 'open' }] };

type StoreMode = 'ok' | 'down';

interface Setup {
  store?: StoreMode;
  storeFailureAt?: 'reserve' | 'day';
  bumpValue?: (key: string) => number;
  duplicateRef?: string | null;
  duplicateRoutingStatus?: 'complete' | 'incomplete';
  ghlFails?: boolean;
  ghlRejects?: boolean;
  upsertHangs?: boolean;
  routingHangs?: boolean;
  completionFails?: boolean;
  atomicDuplicates?: boolean;
}

function setup(opts: Setup = {}) {
  const {
    store = 'ok', storeFailureAt, bumpValue = () => 1, duplicateRef = null, duplicateRoutingStatus = 'complete',
    ghlFails = false, ghlRejects = false, upsertHangs = false, routingHangs = false, completionFails = false,
    atomicDuplicates = false,
  } = opts;
  const calls: { url: string; init: RequestInit }[] = [];
  const reservations = new Map<string, string>();
  const fetchMock = vi.fn(async (url: any, init: RequestInit = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (u.startsWith(STORE)) {
      if (store === 'down') throw new Error('store down');
      if (u.endsWith('/rest/v1/rpc/consume_agent_limit')) {
        const { p_key, p_limit } = JSON.parse(String(init.body));
        if (storeFailureAt === 'day' && p_key === 'estimate:day') {
          return new Response('private failure detail', { status: 503 });
        }
        const used = bumpValue(p_key);
        return new Response(JSON.stringify([{
          allowed: used <= p_limit,
          remaining: Math.max(0, p_limit - used),
        }]), { status: 200 });
      }
      if (u.endsWith('/rest/v1/rpc/reserve_agent_estimate')) {
        if (storeFailureAt === 'reserve') return new Response('private failure detail', { status: 503 });
        const body = JSON.parse(String(init.body));
        if (duplicateRef) return new Response(JSON.stringify([{
          acquired: false,
          reference: duplicateRef,
          reservation_status: 'completed',
          routing_status: duplicateRoutingStatus,
        }]), { status: 200 });
        if (atomicDuplicates) {
          const previous = reservations.get(body.p_payload_hash);
          if (previous) return new Response(JSON.stringify([{
            acquired: false, reference: previous, reservation_status: 'pending', routing_status: 'pending',
          }]), { status: 200 });
          reservations.set(body.p_payload_hash, body.p_reference);
        }
        return new Response(JSON.stringify([{
          acquired: true, reference: body.p_reference, reservation_status: 'pending', routing_status: 'pending',
        }]), { status: 200 });
      }
      if (u.endsWith('/rest/v1/rpc/complete_agent_estimate')) {
        return completionFails
          ? new Response('private failure detail', { status: 503 })
          : new Response('true', { status: 200 });
      }
      if (u.endsWith('/rest/v1/rpc/release_agent_estimate')) return new Response('true', { status: 200 });
      throw new Error(`unexpected store call ${u}`);
    }
    if (u.startsWith(GHL)) {
      if (u.endsWith('/contacts/upsert') && upsertHangs) return new Promise<Response>(() => {});
      if (u.endsWith('/contacts/upsert') && ghlRejects) return new Response('{"message":"rejected"}', { status: 400 });
      if (ghlFails) return new Response('{"message":"boom"}', { status: 500 });
      if (u.endsWith('/contacts/upsert')) return new Response(JSON.stringify({ contact: { id: 'c1' } }), { status: 200 });
      if (u.includes('/opportunities/search?') && routingHangs) return new Promise<Response>(() => {});
      if (u.includes('/opportunities/search?')) return new Response(JSON.stringify(OUTDOOR_OPEN), { status: 200 });
      throw new Error(`unexpected GHL call ${init.method} ${u}`);
    }
    throw new Error(`unexpected host ${u}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  const upserts = () => calls.filter((c) => c.url.endsWith('/contacts/upsert')).map((c) => JSON.parse(String(c.init.body)));
  const leadInserts = () => calls.filter((c) => c.url.endsWith('/rpc/reserve_agent_estimate')).map((c) => JSON.parse(String(c.init.body)));
  const completions = () => calls.filter((c) => c.url.endsWith('/rpc/complete_agent_estimate')).map((c) => JSON.parse(String(c.init.body)));
  const releases = () => calls.filter((c) => c.url.endsWith('/rpc/release_agent_estimate')).map((c) => JSON.parse(String(c.init.body)));
  return { fetchMock, calls, upserts, leadInserts, completions, releases };
}

const call = (body: unknown, headers: Record<string, string> = {}) => {
  const request = new Request('http://localhost:4321/api/agent/estimate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return POST({ request } as unknown as APIContext) as Promise<Response>;
};

const valid = {
  firstName: 'Ana',
  lastName: 'Lopez',
  phone: '(980) 391-6833',
  message: 'Two holes in the living room drywall.',
  service: 'drywall-repair',
  agent: { name: 'Helper', vendor: 'OpenAI ChatGPT!', conversationId: 'conv-123' },
};

beforeEach(() => {
  vi.stubEnv('GHL_API_KEY', 'ghl-test');
  vi.stubEnv('GHL_LOCATION_ID', 'loc-test');
  vi.stubEnv('SUPABASE_URL', STORE);
  vi.stubEnv('SUPABASE_SERVICE_KEY', 'service-test');
  vi.stubEnv('AGENT_SITE_ID', 'site-a');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/agent/estimate validation', () => {
  it('(a) non-JSON body -> 400 with a clear error', async () => {
    const { upserts } = setup();
    const r = await call('firstName=Ana&phone=9803916833');
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/JSON/);
    expect(upserts()).toHaveLength(0);
  });

  it('(b) human phone is normalized to 10 digits in the upsert; 7 digits -> 400', async () => {
    const { upserts } = setup();
    const ok = await call(valid);
    expect(ok.status).toBe(200);
    expect(upserts()[0].phone).toBe('9803916833');

    const bad = await call({ ...valid, phone: '391-6833' });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/phone/);
  });

  it('(c) message with a URL, scheme or bare domain -> 400', async () => {
    setup();
    for (const message of [
      'see http://x.example',
      'upload to ftp://files.example.net',
      'javascript:alert(1)',
      'data:text/html,bad',
      'mailto:spam@example.com',
      'go to www.example.com',
      'details at repairs.example.co.uk/path',
      'domain with a port-like suffix example.com:anything',
      'invalid boundary suffix example.com_',
      'query-like suffix example.com&1',
      'dollar suffix example.com$1',
      'asterisk suffix example.com*',
      'plus suffix example.com+1',
      'tilde suffix example.com~',
      'caret suffix example.com^',
      'braces around {example.com}',
      'angle brackets <example.com>',
      'Unicode domain ｗｗｗ．example．com',
      'IDNA dot example。com',
      'IDNA halfwidth dot example｡com',
      'Unicode labels пример.рф',
      'Unicode labels 例え.テスト',
      'Unicode label münich.de',
      'Symbolic IDN coffee ☕.ws',
      'Emoji IDN pile 💩.la',
      'Emoji TLD example.☕',
      'email belongs only in its field ana@example.com',
    ]) {
      const r = await call({ ...valid, message });
      expect(r.status, message).toBe(400);
      expect((await r.json()).error).toMatch(/message/);
    }
  });

  it('rejects URLs in every free-text field', async () => {
    const { upserts } = setup();
    const cases: [string, Record<string, unknown>][] = [
      ['firstName', { firstName: 'Ana www.spam.example' }],
      ['lastName', { lastName: 'see spam.example' }],
      ['city', { city: 'ftp://spam.example' }],
      ['agent.name', { agent: { name: 'Bot javascript:run()', vendor: 'x' } }],
      ['agent.vendor', { agent: { name: 'Bot', vendor: 'spam.example' } }],
      ['agent.name', { agent: { name: 'bot@例え。テスト', vendor: 'x' } }],
    ];
    for (const [field, patch] of cases) {
      const r = await call({ ...valid, ...patch });
      expect(r.status, field).toBe(400);
      expect((await r.json()).error, field).toContain(`${field} must not contain URLs`);
    }
    expect(upserts()).toHaveLength(0);
  });

  it('accepts a structured email while still rejecting link-shaped free text', async () => {
    const { upserts } = setup();
    const r = await call({ ...valid, email: 'ana@例え。テスト' });
    expect(r.status).toBe(200);
    expect(upserts()[0].email).toBe('ana@例え.テスト');
  });

  it('rejects missing or oversized required fields and a non-object body', async () => {
    setup();
    expect((await call({ ...valid, firstName: '' })).status).toBe(400);
    expect((await call({ ...valid, firstName: 'x'.repeat(81) })).status).toBe(400);
    expect((await call({ ...valid, message: '' })).status).toBe(400);
    expect((await call({ ...valid, message: 'x'.repeat(2001) })).status).toBe(400);
    expect((await call({ ...valid, phone: undefined })).status).toBe(400);
    expect((await call({ ...valid, email: 'not-an-email' })).status).toBe(400);
    expect((await call('[1,2]')).status).toBe(400);
    expect((await call('null')).status).toBe(400);
  });

  it('(g) 20 KB body -> 400', async () => {
    const { upserts } = setup();
    const r = await call({ ...valid, lastName: 'x'.repeat(20 * 1024) });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/16 KB/);
    expect(upserts()).toHaveLength(0);
  });
});

describe('POST /api/agent/estimate success', () => {
  it('(d) valid body -> 200 with reference and nextStep; CRM gets the assistant source, tags and notes', async () => {
    const { upserts, leadInserts } = setup();
    const r = await call(valid);
    expect(r.status).toBe(200);
    expect(r.headers.get('access-control-allow-origin')).toBe('*');
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(body.reference).toMatch(/^[A-Z2-9]{8}$/);
    expect(body.nextStep).toContain('same business day');
    expect(body.nextStep).toContain('Ana');
    expect(JSON.stringify(body)).not.toContain('c1'); // never returns CRM ids

    const up = upserts()[0];
    expect(up.source).toBe('AI Assistant');
    expect(up.tags.slice(0, 3)).toEqual(['website-lead', 'ai-assistant-lead', 'agent:openai-chatgpt']);
    expect(up.tags).toContain('service-drywall-repair');
    const notes = up.customFields.find((f: { id: string }) => f.id === 'HhBO7YQAST3aZR770LJO').value as string;
    expect(
      notes.startsWith(
        `Submitted by AI assistant Helper (openai-chatgpt) on behalf of the homeowner.\nReference: ${body.reference}\nConversation: conv-123\n\n`
      )
    ).toBe(true);
    expect(notes).toContain('Two holes in the living room drywall.');

    const row = leadInserts()[0];
    expect(row).toMatchObject({ p_site: 'site-a', p_reference: body.reference, p_vendor: 'openai-chatgpt', p_conversation_id: 'conv-123' });
    expect(row.p_phone_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.p_payload_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('accepts prose with prices, ampersands and measurements that are not link-shaped', async () => {
    const { upserts } = setup();
    const r = await call({ ...valid, message: 'Budget is $2,500 & up. Deck 12x16, rails 36in high. Call after 5pm.' });
    expect(r.status).toBe(200);
    expect(upserts()).toHaveLength(1);
  });

  it('unknown or inherited service keys become other; agent is optional', async () => {
    const { upserts } = setup();
    for (const service of ['__proto__', 'constructor', 'toString', 'plumbing', 42]) {
      const r = await call({ firstName: 'Bo', phone: '980-391-6833', message: 'Fix a door', service });
      expect(r.status, String(service)).toBe(200);
    }
    for (const up of upserts()) {
      expect(up.tags).toContain('general-inquiry');
      expect(up.tags).toContain('agent:unknown');
      expect(new Set(up.tags).size).toBe(up.tags.length);
    }
  });

  it('a vendor that slugs to a fixed tag does not duplicate tags', async () => {
    const { upserts } = setup();
    await call({ ...valid, agent: { vendor: '' } });
    const tags = upserts()[0].tags as string[];
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe('POST /api/agent/estimate limits and failures', () => {
  it('(e) IP counter over the hourly limit -> 429 with the phone, no CRM call', async () => {
    const { upserts } = setup({ bumpValue: (k) => (k.startsWith('estimate:ip:') ? 6 : 1) });
    const r = await call(valid);
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ success: false, error: 'rate_limited', phone: BRAND.phone });
    expect(upserts()).toHaveLength(0);
  });

  it('IP key is hashed, never the raw IP', async () => {
    const { calls } = setup();
    await call(valid);
    const keys = calls.filter((c) => c.url.endsWith('/rpc/consume_agent_limit')).map((c) => JSON.parse(String(c.init.body)).p_key);
    expect(keys).toContain('estimate:day');
    const ipKey = keys.find((k: string) => k.startsWith('estimate:ip:'));
    expect(ipKey).toMatch(/^estimate:ip:[0-9a-f]{16}$/);
    expect(JSON.stringify(calls.map((c) => c.init.body))).not.toContain('203.0.113.7');
  });

  it('daily counter over the site limit -> 503 with the phone', async () => {
    const { upserts } = setup({ bumpValue: (k) => (k === 'estimate:day' ? 51 : 1) });
    const r = await call(valid);
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ success: false, error: 'temporarily_unavailable', phone: BRAND.phone });
    expect(upserts()).toHaveLength(0);
  });

  it('same normalized payload inside the window -> same reference, no CRM call or daily budget', async () => {
    const { upserts, leadInserts, calls } = setup({ duplicateRef: 'K7M2Q9XA' });
    const r = await call(valid);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toMatchObject({ success: true, reference: 'K7M2Q9XA', duplicate: true });
    expect(body.nextStep).toContain('same business day');
    expect(upserts()).toHaveLength(0);
    expect(leadInserts()).toHaveLength(1);
    const keys = calls.filter((c) => c.url.endsWith('/rpc/consume_agent_limit')).map((c) => JSON.parse(String(c.init.body)).p_key);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^estimate:ip:/);
  });

  it('same phone with different request content is not treated as a duplicate', async () => {
    const { upserts } = setup();
    expect((await call(valid)).status).toBe(200);
    expect((await call({ ...valid, message: 'A different project in the kitchen.' })).status).toBe(200);
    expect(upserts()).toHaveLength(2);
  });

  it('an exact duplicate preserves incomplete routing and never repeats the callback promise', async () => {
    const { upserts } = setup({ duplicateRef: 'K7M2Q9XA', duplicateRoutingStatus: 'incomplete' });
    const r = await call(valid);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      success: true,
      reference: 'K7M2Q9XA',
      nextStep: `Your contact information was saved. If this is urgent, call or text iFIXX at ${BRAND.phone}.`,
      duplicate: true,
      routingPending: true,
    });
    expect(upserts()).toHaveLength(0);
  });

  it('two concurrent identical requests produce one CRM write and one shared reference', async () => {
    const { upserts } = setup({ atomicDuplicates: true });
    const [a, b] = await Promise.all([call(valid), call(valid)]);
    const [bodyA, bodyB] = await Promise.all([a.json(), b.json()]);
    expect([a.status, b.status].sort()).toEqual([200, 202]);
    expect(bodyA.reference).toBe(bodyB.reference);
    expect([bodyA.error, bodyB.error]).toContain('request_in_progress');
    expect(upserts()).toHaveLength(1);
  });

  it('an IP over the limit is refused even when the phone is a duplicate', async () => {
    setup({ duplicateRef: 'K7M2Q9XA', bumpValue: (k) => (k.startsWith('estimate:ip:') ? 6 : 1) });
    expect((await call(valid)).status).toBe(429);
  });

  it('(f) store down -> 503 and never touches the CRM', async () => {
    const { upserts } = setup({ store: 'down' });
    const r = await call(valid);
    expect(r.status).toBe(503);
    expect((await r.json()).error).toBe('temporarily_unavailable');
    expect(upserts()).toHaveLength(0);
    const alarms = vi.mocked(console.error).mock.calls.filter((c) => c[0] === 'agent-store:unprotected');
    expect(alarms).toHaveLength(1);
    expect(String(alarms[0][1])).toMatch(/failed/);
  });

  it.each(['reserve', 'day'] as const)('a %s store failure fails closed before the CRM', async (storeFailureAt) => {
    const { upserts } = setup({ storeFailureAt });
    const r = await call(valid);
    expect(r.status).toBe(503);
    expect((await r.json()).error).toBe('temporarily_unavailable');
    expect(upserts()).toHaveLength(0);
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('private failure detail');
  });

  it('store up -> no unprotected alarm', async () => {
    setup();
    await call(valid);
    expect(vi.mocked(console.error).mock.calls.some((c) => c[0] === 'agent-store:unprotected')).toBe(false);
  });

  it('store env missing -> 503 with no store or CRM calls', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_KEY', '');
    const { calls, upserts } = setup();
    const r = await call(valid);
    expect(r.status).toBe(503);
    expect(upserts()).toHaveLength(0);
    expect(calls.some((c) => c.url.startsWith(STORE))).toBe(false);
    expect(vi.mocked(console.error).mock.calls).toContainEqual([
      'agent estimate: store not configured, requests paused',
    ]);
  });

  it('CRM failure -> 502 crm_unavailable with the phone', async () => {
    const { releases } = setup({ ghlFails: true });
    const r = await call(valid);
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ success: false, error: 'crm_unavailable', phone: BRAND.phone });
    expect(releases()).toHaveLength(0); // 5xx may have written before answering.
  });

  it('a definitive 4xx upsert rejection releases the reservation for a safe retry', async () => {
    const { releases } = setup({ ghlRejects: true });
    expect((await call(valid)).status).toBe(502);
    expect(releases()).toHaveLength(1);
  });

  it('an ambiguous upsert timeout keeps the reservation pending and returns within the total deadline', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-20T15:00:00.000Z') });
    try {
      const { calls, releases } = setup({ upsertHangs: true });
      const pending = call(valid);
      let settled = false;
      pending.finally(() => { settled = true; }).catch(() => {});
      await vi.advanceTimersByTimeAsync(7999);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      const r = await pending;
      expect(r.status).toBe(502);
      expect(releases()).toHaveLength(0);
      const upsert = calls.find((c) => c.url.endsWith('/contacts/upsert'));
      expect(upsert?.init.signal).toBeInstanceOf(AbortSignal);
      expect((upsert?.init.signal as AbortSignal).aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a routing timeout returns contact-only success, persists incomplete routing, and never releases', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-20T15:00:00.000Z') });
    try {
      const { completions, releases, upserts } = setup({ routingHangs: true });
      const pending = call(valid);
      await vi.advanceTimersByTimeAsync(8000);
      const r = await pending;
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body).toMatchObject({ success: true, routingPending: true });
      expect(body.nextStep).toBe(
        `Your contact information was saved. If this is urgent, call or text iFIXX at ${BRAND.phone}.`
      );
      expect(body.nextStep).not.toContain('same business day');
      expect(upserts()).toHaveLength(1);
      expect(releases()).toHaveLength(0);
      expect(completions()).toHaveLength(1);
      expect(completions()[0].p_routing_status).toBe('incomplete');
      expect(vi.mocked(console.error).mock.calls).toContainEqual([
        'GHL routing incomplete after contact upsert; manual workflow required',
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a completion-store failure remains pending and returns no callback promise after CRM success', async () => {
    const { completions, releases, upserts } = setup({ completionFails: true });
    const r = await call(valid);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toMatchObject({ success: true, reconciliationPending: true });
    expect(body.routingPending).toBeUndefined();
    expect(body.nextStep).toBe(
      `Your contact information was saved. If this is urgent, call or text iFIXX at ${BRAND.phone}.`
    );
    expect(body.nextStep).not.toContain('same business day');
    expect(upserts()).toHaveLength(1);
    expect(completions()).toHaveLength(1);
    expect(releases()).toHaveLength(0);
    expect(vi.mocked(console.error).mock.calls).toContainEqual([
      'agent estimate: completion record failed; reconcile pending reference',
    ]);
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('private failure detail');
  });

  it('CRM env missing -> 502, never 500', async () => {
    vi.stubEnv('GHL_API_KEY', '');
    const { upserts } = setup();
    const r = await call(valid);
    expect(r.status).toBe(502);
    expect((await r.json()).error).toBe('crm_unavailable');
    expect(upserts()).toHaveLength(0);
  });
});

describe('OPTIONS and GET /api/agent', () => {
  it('OPTIONS answers the CORS preflight on both routes', async () => {
    for (const handler of [OPTIONS, OPTIONS_API]) {
      const r = (await handler({} as unknown as APIContext)) as Response;
      expect(r.status).toBe(204);
      expect(r.headers.get('access-control-allow-origin')).toBe('*');
    }
  });

  it('GET /api/agent returns the API description with the live service keys', async () => {
    const request = new Request('http://localhost:4321/api/agent');
    const r = (await GET_API({ request } as unknown as APIContext)) as Response;
    expect(r.status).toBe(200);
    expect(r.headers.get('access-control-allow-origin')).toBe('*');
    const d = await r.json();
    expect(d.endpoints.estimate.method).toBe('POST');
    expect(d.endpoints.estimate.limitsText).toContain('Exact rolling windows');
    expect(d.endpoints.estimate.limitsText).toContain('trailing 60 minutes');
    expect(d.endpoints.estimate.limitsText).toContain('trailing one-day period');
    expect(d.endpoints.estimate.limitsText.toLowerCase()).not.toContain('token bucket');
    expect(d.serviceKeys).toContain('other');
    expect(d.serviceKeys).toContain('drywall-repair');
  });
});

describe('final review: services outside the agent list (finding 2)', () => {
  it.each(['emergency', 'emergency-repair', 'roof-leak', 'water-damage', 'pressure-washing', 'fence', 'deck'])(
    '"%s" is recorded as other, never urgent',
    async (service) => {
      const { upserts } = setup();
      const r = await call({ ...valid, service });
      expect(r.status).toBe(200);
      const tags = upserts()[0].tags as string[];
      expect(tags).toContain('general-inquiry');
      expect(tags).not.toContain('urgent');
      expect(tags.some((t) => t.includes('emergency'))).toBe(false);
    }
  );

  it('a listed key keeps its own tags', async () => {
    const { upserts } = setup();
    await call({ ...valid, service: 'fence-install' });
    expect(upserts()[0].tags).toContain('service-fence-install');
  });

  it('GET /api/agent documents only AGENT_SERVICE_KEYS', async () => {
    const request = new Request('http://localhost:4321/api/agent');
    const d = await ((await GET_API({ request } as unknown as APIContext)) as Response).json();
    expect(d.serviceKeys).toEqual(AGENT_SERVICE_KEYS);
    for (const k of ['emergency', 'emergency-repair', 'pressure-washing', 'roof-leak', 'water-damage']) {
      expect(d.serviceKeys, k).not.toContain(k);
    }
  });
});

describe('final review: store unconfigured in Production (finding 4)', () => {
  it('Production without SUPABASE_URL -> 503 temporarily_unavailable with the phone, before any call', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('SUPABASE_URL', '');
    const { fetchMock } = setup();
    const r = await call(valid);
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ success: false, error: 'temporarily_unavailable', phone: BRAND.phone });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Production without SUPABASE_SERVICE_KEY -> 503, no CRM call', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('SUPABASE_SERVICE_KEY', '');
    const { fetchMock } = setup();
    expect((await call(valid)).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validation still answers 400 first in Production', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('SUPABASE_URL', '');
    setup();
    expect((await call({ ...valid, phone: '12345' })).status).toBe(400);
  });

  it('Preview without the store also fails closed', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('SUPABASE_URL', '');
    const { upserts } = setup();
    expect((await call(valid)).status).toBe(503);
    expect(upserts()).toHaveLength(0);
  });

  it('Production with the store configured but down fails closed', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    const { upserts } = setup({ store: 'down' });
    expect((await call(valid)).status).toBe(503);
    expect(upserts()).toHaveLength(0);
  });

  it('the API description documents the 503 for both cases', async () => {
    const request = new Request('http://localhost:4321/api/agent');
    const d = await ((await GET_API({ request } as unknown as APIContext)) as Response).json();
    expect(d.endpoints.estimate.errors['503']).toMatch(/temporarily_unavailable/);
    expect(d.endpoints.estimate.errors['503']).toMatch(/paused/);
  });
});
