import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIContext } from 'astro';
import { POST, OPTIONS } from '../src/pages/api/agent/estimate';
import { GET as GET_API, OPTIONS as OPTIONS_API } from '../src/pages/api/agent/index';
import { BRAND } from '../src/lib/agent-facts';

const STORE = 'https://store.test';
const GHL = 'https://services.leadconnectorhq.com';
// Open opportunity in the Ifixx 2026 pipeline: routing returns at once, no retries or waits.
const OUTDOOR_OPEN = { opportunities: [{ id: 'o1', pipelineId: 'QlQ4FGiqHYUgMAUwxjb1', status: 'open' }] };

type StoreMode = 'ok' | 'down';

interface Setup {
  store?: StoreMode;
  bumpValue?: (key: string) => number;
  duplicateRef?: string | null;
  ghlFails?: boolean;
}

function setup(opts: Setup = {}) {
  const { store = 'ok', bumpValue = () => 1, duplicateRef = null, ghlFails = false } = opts;
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchMock = vi.fn(async (url: any, init: RequestInit = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (u.startsWith(STORE)) {
      if (store === 'down') throw new Error('store down');
      if (u.endsWith('/rest/v1/rpc/bump_counter')) {
        const { p_key } = JSON.parse(String(init.body));
        return new Response(String(bumpValue(p_key)), { status: 200 });
      }
      if (u.includes('/rest/v1/agent_leads?')) {
        return new Response(JSON.stringify(duplicateRef ? [{ reference: duplicateRef }] : []), { status: 200 });
      }
      if (u.endsWith('/rest/v1/agent_leads')) return new Response(null, { status: 201 });
      throw new Error(`unexpected store call ${u}`);
    }
    if (u.startsWith(GHL)) {
      if (ghlFails) return new Response('{"message":"boom"}', { status: 500 });
      if (u.endsWith('/contacts/upsert')) return new Response(JSON.stringify({ contact: { id: 'c1' } }), { status: 200 });
      if (u.includes('/opportunities/search?')) return new Response(JSON.stringify(OUTDOOR_OPEN), { status: 200 });
      throw new Error(`unexpected GHL call ${init.method} ${u}`);
    }
    throw new Error(`unexpected host ${u}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  const upserts = () => calls.filter((c) => c.url.endsWith('/contacts/upsert')).map((c) => JSON.parse(String(c.init.body)));
  const leadInserts = () => calls.filter((c) => c.url === `${STORE}/rest/v1/agent_leads`).map((c) => JSON.parse(String(c.init.body)));
  return { fetchMock, calls, upserts, leadInserts };
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

  it('(c) message with a URL -> 400', async () => {
    setup();
    for (const message of ['see http://x.example', 'https://x.example', 'go to www.example.com']) {
      const r = await call({ ...valid, message });
      expect(r.status, message).toBe(400);
      expect((await r.json()).error).toMatch(/message/);
    }
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
    expect(notes.startsWith('Submitted by AI assistant Helper (openai-chatgpt) on behalf of the homeowner.\nConversation: conv-123\n\n')).toBe(true);
    expect(notes).toContain('Two holes in the living room drywall.');

    const row = leadInserts()[0];
    expect(row).toMatchObject({ site: 'site-a', reference: body.reference, vendor: 'openai-chatgpt', conversation_id: 'conv-123', contact_id: 'c1' });
    expect(row.phone_hash).toMatch(/^[0-9a-f]{64}$/);
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
    const keys = calls.filter((c) => c.url.endsWith('/rpc/bump_counter')).map((c) => JSON.parse(String(c.init.body)).p_key);
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

  it('same phone inside the window -> 200 with the same reference, duplicate true, no CRM call', async () => {
    const { upserts, leadInserts } = setup({ duplicateRef: 'K7M2Q9XA' });
    const r = await call(valid);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toMatchObject({ success: true, reference: 'K7M2Q9XA', duplicate: true });
    expect(body.nextStep).toContain('same business day');
    expect(upserts()).toHaveLength(0);
    expect(leadInserts()).toHaveLength(0);
  });

  it('(f) store down -> still 200 and the CRM still gets the lead', async () => {
    const { upserts } = setup({ store: 'down' });
    const r = await call(valid);
    expect(r.status).toBe(200);
    expect((await r.json()).reference).toMatch(/^[A-Z2-9]{8}$/);
    expect(upserts()).toHaveLength(1);
  });

  it('store env missing -> still 200 with no store calls', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_KEY', '');
    const { calls, upserts } = setup();
    const r = await call(valid);
    expect(r.status).toBe(200);
    expect(upserts()).toHaveLength(1);
    expect(calls.some((c) => c.url.startsWith(STORE))).toBe(false);
  });

  it('CRM failure -> 502 crm_unavailable with the phone', async () => {
    setup({ ghlFails: true });
    const r = await call(valid);
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ success: false, error: 'crm_unavailable', phone: BRAND.phone });
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
    expect(d.serviceKeys).toContain('other');
    expect(d.serviceKeys).toContain('drywall-repair');
  });
});
