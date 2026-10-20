import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildUpsertBody, submitLead, SERVICE_TAGS, type LeadEnv } from '../src/lib/lead-intake';

const env: LeadEnv = { apiKey: 'test-key', locationId: 'loc-test', origin: 'https://www.ifixxnc.com' };
const PROJECT_NOTES = 'HhBO7YQAST3aZR770LJO';

const base = {
  firstName: 'Ana',
  phone: '9803916833',
  service: 'drywall-repair',
  page_path: '/repairs/drywall',
  utm_source: 'google',
  gclid: 'X',
};

describe('buildUpsertBody', () => {
  it('(a) tags, source and attribution match the current form', () => {
    const body = buildUpsertBody(base, env);
    expect(body.tags).toEqual(['website-lead', 'service-drywall-repair', 'service-painting', 'handyman', 'form:repairs-drywall']);
    expect(body.source).toBe('Website Form');
    expect(body.locationId).toBe('loc-test');
    expect(body.attributionSource.gclid).toBe('X');
    expect(body.attributionSource.url).toBe('https://www.ifixxnc.com/repairs/drywall');
  });

  it('(b) extraTags go right after website-lead and notesPrefix opens Project Notes', () => {
    const body = buildUpsertBody(
      { ...base, extraTags: ['ai-assistant-lead', 'agent:openai'], notesPrefix: 'Submitted by AI assistant' },
      env
    );
    expect(body.tags.slice(0, 3)).toEqual(['website-lead', 'ai-assistant-lead', 'agent:openai']);
    expect(body.tags.slice(3)).toEqual(['service-drywall-repair', 'service-painting', 'handyman', 'form:repairs-drywall']);
    const notes = body.customFields.find((f: { id: string }) => f.id === PROJECT_NOTES);
    expect(notes.value.startsWith('Submitted by AI assistant')).toBe(true);
  });

  it('(b2) notesPrefix is followed by a blank line before the customer message', () => {
    const body = buildUpsertBody({ ...base, message: 'Hole in the wall', notesPrefix: 'Submitted by AI assistant' }, env);
    const notes = body.customFields.find((f: { id: string }) => f.id === PROJECT_NOTES);
    expect(notes.value).toBe('Submitted by AI assistant\n\nHole in the wall');
  });

  it('exports SERVICE_TAGS', () => {
    expect(SERVICE_TAGS['drywall-repair']).toEqual(['service-drywall-repair', 'service-painting', 'handyman']);
  });
});

describe('submitLead', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-20T15:00:00.000Z') }));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('(c) upserts, finds nothing, creates the Ifixx 2026 opportunity', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn(async (url: any, init: RequestInit = {}) => {
      const u = String(url);
      if (u.endsWith('/contacts/upsert')) return new Response(JSON.stringify({ contact: { id: 'c1' } }), { status: 200 });
      if (u.includes('/opportunities/search?')) return new Response(JSON.stringify({ opportunities: [] }), { status: 200 });
      if (u.endsWith('/opportunities/') && init.method === 'POST')
        return new Response(JSON.stringify({ opportunity: { id: 'o1' } }), { status: 200 });
      throw new Error(`unexpected ${init.method} ${u}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const p = submitLead(base, env);
    let done = false;
    p.finally(() => (done = true)).catch(() => {});
    for (let i = 0; i < 200 && !done; i++) await vi.advanceTimersByTimeAsync(250);
    const result = await p;

    expect(result.contactId).toBe('c1');
    expect(result.routing.action).toBe('created-outdoor');
    expect(result.routing.opportunityId).toBe('o1');
    expect(result.tags).toEqual(['website-lead', 'service-drywall-repair', 'service-painting', 'handyman', 'form:repairs-drywall']);
    // 8 routing searches + 4 cleanup searches, never a live host other than the CRM mock.
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('/opportunities/search?')).length).toBe(12);
  });

  it('aborts and rejects a CRM request that does not answer within five seconds', async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn(async (_url: any, init: RequestInit = {}) => {
      signal = init.signal ?? undefined;
      return new Promise<Response>(() => {});
    }));
    const rejected = expect(submitLead(base, env)).rejects.toThrow('GHL request timed out');
    await vi.advanceTimersByTimeAsync(5000);
    await rejected;
    expect(signal?.aborted).toBe(true);
  });
});
