import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIContext } from 'astro';
import { POST, OPTIONS } from '../src/pages/api/agent/estimate';
import { GET as GET_API, OPTIONS as OPTIONS_API } from '../src/pages/api/agent/index';
import { AGENT_SERVICE_KEYS, BRAND } from '../src/lib/agent-facts';
import { AGENT_SETTLE } from '../src/lib/lead-intake';

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
  existingBy?: 'phone' | 'email' | null;
  createDuplicateOf?: string;
  lookupFails?: boolean;
  noteStatus?: number | 'hang';
  phoneLimitDown?: boolean;
  openOpportunity?: boolean;
  handymanRecent?: boolean;
}

function setup(opts: Setup = {}) {
  const {
    store = 'ok', storeFailureAt, bumpValue = () => 1, duplicateRef = null, duplicateRoutingStatus = 'complete',
    ghlFails = false, ghlRejects = false, upsertHangs = false, routingHangs = false, completionFails = false,
    atomicDuplicates = false, existingBy = null, createDuplicateOf, lookupFails = false, noteStatus = 201,
    phoneLimitDown = false, openOpportunity = true, handymanRecent = false,
  } = opts;
  const calls: { url: string; init: RequestInit }[] = [];
  const crm: Record<string, Record<string, unknown>> = {
    'existing-1': {
      firstName: 'Real', lastName: 'Customer', email: 'real.customer@example.org', phone: '+19803916833',
      source: 'Website Form', postalCode: '28226', tags: ['website-lead', 'customer'],
      customFields: [{ id: 'HhBO7YQAST3aZR770LJO', value: 'Kitchen remodel 2025' }],
    },
  };
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
        if (phoneLimitDown && String(p_key).startsWith('estimate:phone:')) {
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
      // The public endpoint must never use upsert or write to a contact record.
      // A stand-in CRM record: any upsert or contact write lands on it like GHL would, so
      // a test can compare the record byte for byte before and after.
      if (u.endsWith('/contacts/upsert')) {
        Object.assign(crm['existing-1'], JSON.parse(String(init.body)));
        return new Response(JSON.stringify({ contact: { id: 'existing-1' } }), { status: 200 });
      }
      const write = /\/contacts\/([^/?]+)(\/tags)?$/.exec(u);
      if (write && init.method && init.method !== 'GET' && crm[write[1]]) {
        Object.assign(crm[write[1]], JSON.parse(String(init.body || '{}')));
        return new Response('{}', { status: 200 });
      }
      if (u.includes('/contacts/search/duplicate?')) {
        if (lookupFails) return new Response('{"message":"boom"}', { status: 500 });
        const q = new URL(u).searchParams;
        const hit = (existingBy === 'phone' && q.has('number')) || (existingBy === 'email' && q.has('email'));
        return new Response(JSON.stringify({
          contact: hit ? {
            id: 'existing-1', firstName: 'Real', lastName: 'Customer',
            phone: existingBy === 'phone' ? '+19803916833' : '+17045550142',
          } : null,
        }), { status: 200 });
      }
      if (u === `${GHL}/contacts/` && init.method === 'POST') {
        if (upsertHangs) return new Promise<Response>(() => {});
        if (ghlRejects) return new Response('{"message":"rejected"}', { status: 400 });
        if (createDuplicateOf) return new Response(JSON.stringify({
          statusCode: 400, message: 'This location does not allow duplicated contacts.', meta: { contactId: createDuplicateOf },
        }), { status: 400 });
        if (ghlFails) return new Response('{"message":"boom"}', { status: 500 });
        return new Response(JSON.stringify({ contact: { id: 'c1' } }), { status: 201 });
      }
      if (/\/contacts\/[^/]+\/notes$/.test(u)) {
        if (noteStatus === 'hang') return new Promise<Response>(() => {});
        return new Response('{"note":{"id":"n1"}}', { status: noteStatus });
      }
      if (ghlFails) return new Response('{"message":"boom"}', { status: 500 });
      if (u.includes('/opportunities/search?') && routingHangs) return new Promise<Response>(() => {});
      if (u.includes('/opportunities/search?')) {
        const found = [
          ...(openOpportunity ? OUTDOOR_OPEN.opportunities : []),
          // A recent Handyman opportunity, the shape GHL tag workflows leave behind.
          ...(handymanRecent ? [{ id: 'h1', pipelineId: 'ohDTFoWOfNfAYQ89MWEo', status: 'open' }] : []),
        ];
        return new Response(JSON.stringify({ opportunities: found }), { status: 200 });
      }
      if (u === `${GHL}/opportunities/` && init.method === 'POST') {
        return new Response(JSON.stringify({ opportunity: { id: 'o2' } }), { status: 201 });
      }
      if (/\/opportunities\/[^/?]+$/.test(u) && (init.method === 'DELETE' || init.method === 'PUT')) {
        return new Response('{}', { status: 200 });
      }
      throw new Error(`unexpected GHL call ${init.method} ${u}`);
    }
    throw new Error(`unexpected host ${u}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  // Contact creations (POST /contacts/). Named after the upsert it replaced so the
  // older assertions on the contact body keep reading the same.
  const upserts = () => calls
    .filter((c) => c.url === `${GHL}/contacts/` && c.init.method === 'POST')
    .map((c) => JSON.parse(String(c.init.body)));
  const notes = () => calls
    .filter((c) => /\/contacts\/[^/]+\/notes$/.test(c.url))
    .map((c) => ({ url: c.url, body: JSON.parse(String(c.init.body)).body as string }));
  const opportunityCreates = () => calls
    .filter((c) => c.url === `${GHL}/opportunities/` && c.init.method === 'POST')
    .map((c) => JSON.parse(String(c.init.body)));
  const limitKeys = () => calls
    .filter((c) => c.url.endsWith('/rpc/consume_agent_limit'))
    .map((c) => JSON.parse(String(c.init.body)).p_key as string);
  const leadInserts = () => calls.filter((c) => c.url.endsWith('/rpc/reserve_agent_estimate')).map((c) => JSON.parse(String(c.init.body)));
  const completions = () => calls.filter((c) => c.url.endsWith('/rpc/complete_agent_estimate')).map((c) => JSON.parse(String(c.init.body)));
  const releases = () => calls.filter((c) => c.url.endsWith('/rpc/release_agent_estimate')).map((c) => JSON.parse(String(c.init.body)));
  return { fetchMock, calls, crm, upserts, notes, opportunityCreates, limitKeys, leadInserts, completions, releases };
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
  // The real settle time is exercised by the timing tests below.
  AGENT_SETTLE.stepMs = 0;
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
      'IPv4 literal with a path 192.168.0.1/admin',
      'bare IPv4 literal 1.2.3.4',
      'leading hyphen -example.com',
      'trailing hyphen example.com-',
      'leading dot .example.com',
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

  it('an ambiguous contact-create timeout keeps the reservation pending and returns within the total deadline', async () => {
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
      const upsert = calls.find((c) => c.url === 'https://services.leadconnectorhq.com/contacts/' && c.init.method === 'POST');
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
        'GHL routing incomplete after the agent request was recorded; manual workflow required',
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

describe('POST /api/agent/estimate never modifies an existing contact (A02)', () => {
  const ghlCallsTo = (calls: { url: string; init: RequestInit }[], fragment: string) =>
    calls.filter((c) => c.url.startsWith(GHL) && c.url.includes(fragment));

  it('a phone match reuses the contact untouched: no create, no tags, no field writes, request kept as a note', async () => {
    const { calls, crm, upserts, notes, opportunityCreates } = setup({ existingBy: 'phone', openOpportunity: false });
    const before = JSON.stringify(crm['existing-1']);
    const r = await call({ ...valid, firstName: 'Mallory', email: 'attacker@example.org', zipCode: '28277' });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toEqual({ success: true, reference: body.reference, nextStep: body.nextStep });
    expect(upserts()).toHaveLength(0);
    // The only request that names the contact is the note: no PUT, no tags, no custom fields.
    const touching = ghlCallsTo(calls, '/contacts/existing-1');
    expect(touching.map((c) => c.url)).toEqual([`${GHL}/contacts/existing-1/notes`]);
    expect(ghlCallsTo(calls, '/tags')).toHaveLength(0);
    expect(ghlCallsTo(calls, '/contacts/upsert')).toHaveLength(0);
    // Name, email, source, ZIP, tags and custom fields are byte-for-byte what they were.
    expect(JSON.stringify(crm['existing-1'])).toBe(before);
    const [note] = notes();
    expect(note.body).toContain(`Reference: ${body.reference}`);
    expect(note.body).toContain('The contact record was NOT changed');
    expect(note.body).toContain('Name: Mallory Lopez');
    expect(note.body).toContain('Email: attacker@example.org');
    expect(note.body).toContain('Two holes in the living room drywall.');
    // The opportunity is named from the CRM record, never from the submitted name.
    expect(opportunityCreates()).toHaveLength(1);
    expect(opportunityCreates()[0]).toMatchObject({
      contactId: 'existing-1',
      name: 'Real Customer - AI Assistant Request',
      source: 'AI Assistant',
      pipelineStageId: '2f5e3e61-cbe2-4350-8010-dd8c3335d419',
    });
  });

  it('an existing contact is routed with one search and no Handyman polling', async () => {
    const { calls } = setup({ existingBy: 'phone', openOpportunity: false });
    await call(valid);
    expect(ghlCallsTo(calls, '/opportunities/search?')).toHaveLength(1);
  });

  it('an existing contact with an open Ifixx 2026 opportunity gets the note and no second opportunity', async () => {
    const { notes, opportunityCreates } = setup({ existingBy: 'phone' });
    const r = await call(valid);
    expect(r.status).toBe(200);
    expect(notes()).toHaveLength(1);
    expect(opportunityCreates()).toHaveLength(0);
  });

  it('an email match with a different phone is treated the same way', async () => {
    const { calls, upserts, notes } = setup({ existingBy: 'email', openOpportunity: false });
    const r = await call({ ...valid, email: 'real.customer@example.org' });
    expect(r.status).toBe(200);
    expect(upserts()).toHaveLength(0);
    expect(notes()[0].url).toBe(`${GHL}/contacts/existing-1/notes`);
    const lookups = ghlCallsTo(calls, '/contacts/search/duplicate?').map((c) => new URL(c.url).searchParams);
    expect(lookups[0].get('number')).toBe('+19803916833');
    expect(lookups[1].get('email')).toBe('real.customer@example.org');
  });

  it('a create that loses a race to an existing contact reuses it and never retries as an update', async () => {
    const { calls, upserts, notes, opportunityCreates } = setup({ createDuplicateOf: 'raced-9', openOpportunity: false });
    const r = await call(valid);
    expect(r.status).toBe(200);
    expect(upserts()).toHaveLength(1);
    expect(notes()[0].url).toBe(`${GHL}/contacts/raced-9/notes`);
    expect(notes()[0].body).toContain('The contact record was NOT changed');
    expect(opportunityCreates()[0]).toMatchObject({ contactId: 'raced-9', name: 'Existing contact - AI Assistant Request' });
    expect(ghlCallsTo(calls, '/contacts/raced-9').map((c) => c.url)).toEqual([`${GHL}/contacts/raced-9/notes`]);
  });

  it('new and existing contacts get the same response shape and next step', async () => {
    setup();
    const fresh = await (await call(valid)).json();
    vi.unstubAllGlobals();
    setup({ existingBy: 'phone' });
    const known = await (await call(valid)).json();
    expect(Object.keys(known).sort()).toEqual(Object.keys(fresh).sort());
    expect(known.nextStep).toBe(fresh.nextStep);
  });

  it('a new contact is created (not upserted) with the assistant tags and the request also lands as a note', async () => {
    const { upserts, notes, opportunityCreates } = setup({ openOpportunity: false });
    vi.useFakeTimers({ now: new Date('2026-10-20T15:00:00.000Z') });
    try {
      const pending = call(valid);
      await vi.advanceTimersByTimeAsync(8000);
      const r = await pending;
      const body = await r.json();
      expect(r.status).toBe(200);
      expect(upserts()[0]).toMatchObject({ firstName: 'Ana', source: 'AI Assistant', locationId: 'loc-test' });
      expect(upserts()[0].tags).toContain('ai-assistant-lead');
      expect(notes()[0].url).toBe(`${GHL}/contacts/c1/notes`);
      expect(notes()[0].body).toContain(`Reference: ${body.reference}`);
      expect(notes()[0].body).not.toContain('NOT changed');
      expect(opportunityCreates()[0]).toMatchObject({ contactId: 'c1', name: 'Ana Lopez - AI Assistant Request' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('a failed lookup writes nothing and releases the reservation for a safe retry', async () => {
    const { upserts, notes, releases } = setup({ lookupFails: true });
    const r = await call(valid);
    expect(r.status).toBe(502);
    expect(upserts()).toHaveLength(0);
    expect(notes()).toHaveLength(0);
    expect(releases()).toHaveLength(1);
  });

  it('a rejected note on an existing contact is a safe retry; an unknown one keeps the reservation', async () => {
    const rejected = setup({ existingBy: 'phone', noteStatus: 400 });
    expect((await call(valid)).status).toBe(502);
    expect(rejected.releases()).toHaveLength(1);
    expect(rejected.opportunityCreates()).toHaveLength(0);
    vi.unstubAllGlobals();
    const unknown = setup({ existingBy: 'phone', noteStatus: 503 });
    expect((await call(valid)).status).toBe(502);
    expect(unknown.releases()).toHaveLength(0);
  });

  it('a failed note on a new contact does not lose the lead: Project Notes already holds it', async () => {
    const { completions } = setup({ noteStatus: 503 });
    const r = await call(valid);
    expect(r.status).toBe(200);
    expect(completions()[0].p_routing_status).toBe('complete');
  });
});

describe('POST /api/agent/estimate consent text: one per phone per day', () => {
  it('consumes a per-phone daily key, hashed, never the raw phone', async () => {
    const { limitKeys } = setup();
    await call(valid);
    const phoneKey = limitKeys().find((k) => k.startsWith('estimate:phone:'));
    expect(phoneKey).toMatch(/^estimate:phone:[0-9a-f]{16}$/);
    expect(limitKeys().join(' ')).not.toContain('9803916833');
  });

  it('a second request for the same phone in a day is recorded as a note but opens no opportunity', async () => {
    const { notes, opportunityCreates, calls, completions } = setup({
      bumpValue: (key) => (key.startsWith('estimate:phone:') ? 2 : 1),
      openOpportunity: false,
    });
    const r = await call({ ...valid, message: 'Also the hallway ceiling.' });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toEqual({ success: true, reference: body.reference, nextStep: body.nextStep });
    expect(notes()).toHaveLength(1);
    expect(opportunityCreates()).toHaveLength(0);
    expect(calls.some((c) => c.url.includes('/opportunities/'))).toBe(false);
    expect(completions()[0].p_routing_status).toBe('complete');
  });

  it('if the per-phone limit cannot be checked, the request is kept and left for staff, never routed blind', async () => {
    const { notes, opportunityCreates, completions } = setup({ phoneLimitDown: true });
    const r = await call(valid);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ success: true, routingPending: true });
    expect(notes()).toHaveLength(1);
    expect(opportunityCreates()).toHaveLength(0);
    expect(completions()[0].p_routing_status).toBe('incomplete');
  });

  it('the phone limit is only consumed after the request is safely recorded', async () => {
    const { limitKeys } = setup({ lookupFails: true });
    await call(valid);
    expect(limitKeys().some((k) => k.startsWith('estimate:phone:'))).toBe(false);
  });
});

describe('POST /api/agent/estimate answers the same for new and existing contacts (QA round 1)', () => {
  const drive = async (opts: Parameters<typeof setup>[0]) => {
    AGENT_SETTLE.stepMs = 1000;
    vi.useFakeTimers({ now: new Date('2026-10-20T15:00:00.000Z') });
    try {
      const harness = setup(opts);
      const started = Date.now();
      const pending = call(valid);
      let settledAt = 0;
      pending.finally(() => { settledAt = Date.now(); }).catch(() => {});
      for (let i = 0; i < 20 && !settledAt; i++) await vi.advanceTimersByTimeAsync(250);
      const body = await (await pending).json();
      return { ...harness, body, elapsed: settledAt - started };
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  };

  it('a new contact with no opportunity routes completely inside the deadline, like an existing one', async () => {
    const fresh = await drive({ openOpportunity: false });
    const known = await drive({ existingBy: 'phone', openOpportunity: false });
    expect(fresh.body.routingPending).toBeUndefined();
    expect(known.body.routingPending).toBeUndefined();
    expect(Object.keys(fresh.body).sort()).toEqual(Object.keys(known.body).sort());
    expect(fresh.body.nextStep).toBe(known.body.nextStep);
    expect(fresh.completions()[0].p_routing_status).toBe('complete');
    expect(fresh.opportunityCreates()).toHaveLength(1);
    // Both wait the same settle time; neither polls for a Handyman opportunity.
    expect(fresh.elapsed).toBe(known.elapsed);
    expect(fresh.elapsed).toBeLessThan(8000);
  });

  it('an existing contact never has its other opportunities moved, renamed or deleted', async () => {
    for (const openOpportunity of [true, false]) {
      const { calls } = await drive({ existingBy: 'phone', openOpportunity, handymanRecent: true });
      const writes = calls.filter((c) => /\/opportunities\/[^/?]+$/.test(c.url) && c.init.method !== 'GET');
      expect(writes).toEqual([]);
    }
  });

  it('a new contact still gets its Handyman duplicate cleaned up after the Ifixx 2026 opportunity opens', async () => {
    const { calls } = await drive({ handymanRecent: true });
    const deletes = calls.filter((c) => c.init.method === 'DELETE').map((c) => c.url);
    expect(deletes).toContain(`${GHL}/opportunities/h1`);
    expect(calls.some((c) => c.init.method === 'PUT')).toBe(false);
  });

  it('the daily consent cap counts the phone the text goes to, not the submitted one', async () => {
    const { limitKeys } = setup({ existingBy: 'email', openOpportunity: false });
    await call({ ...valid, email: 'real.customer@example.org' });
    const { createHash } = await import('node:crypto');
    const crmPhoneKey = `estimate:phone:${createHash('sha256').update('7045550142').digest('hex').slice(0, 16)}`;
    expect(limitKeys()).toContain(crmPhoneKey);
  });

  it('a failed note on an existing contact never consumes the consent cap', async () => {
    const { limitKeys } = setup({ existingBy: 'phone', noteStatus: 400 });
    await call(valid);
    expect(limitKeys().some((k) => k.startsWith('estimate:phone:'))).toBe(false);
  });
});
