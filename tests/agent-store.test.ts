import { afterEach, describe, expect, it, vi } from 'vitest';
import { bump, recentLeadReference, saveConversation, saveLead, type StoreEnv } from '../src/lib/agent-store';

const env: StoreEnv = { url: 'https://store.test', key: 'service-key', site: 'site-a' };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const quiet = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('bump', () => {
  it('returns the count the bump_counter RPC answers, scoped by site and window', async () => {
    const fetchMock = vi.fn(async (_url: any, _init?: RequestInit) => new Response('3', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await bump(env, 'estimate:day', 86400)).toBe(3);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://store.test/rest/v1/rpc/bump_counter');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ p_site: 'site-a', p_key: 'estimate:day', p_window_seconds: 86400 });
    const headers = new Headers(init?.headers);
    expect(headers.get('apikey')).toBe('service-key');
    expect(headers.get('authorization')).toBe('Bearer service-key');
  });

  it('returns -1 without a url, and never calls fetch', async () => {
    quiet();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await bump({ site: 'site-a' }, 'k', 60)).toBe(-1);
    expect(await bump({ url: 'https://store.test', site: 'site-a' }, 'k', 60)).toBe(-1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns -1 and does not throw when fetch throws', async () => {
    const warn = quiet();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    await expect(bump(env, 'k', 60)).resolves.toBe(-1);
    expect(warn).toHaveBeenCalled();
  });

  it('returns -1 on a non-2xx answer', async () => {
    quiet();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"nope"}', { status: 500 })));
    expect(await bump(env, 'k', 60)).toBe(-1);
  });
});

describe('recentLeadReference', () => {
  it('queries agent_leads by site, phone hash and window, and returns the reference', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-21T12:10:00.000Z'), toFake: ['Date'] });
    const fetchMock = vi.fn(async (_url: any, _init?: RequestInit) =>
      new Response(JSON.stringify([{ reference: 'ABCD2345' }]), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    expect(await recentLeadReference(env, 'hash1', 600)).toBe('ABCD2345');
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe('/rest/v1/agent_leads');
    expect(url.searchParams.get('site')).toBe('eq.site-a');
    expect(url.searchParams.get('phone_hash')).toBe('eq.hash1');
    expect(url.searchParams.get('created_at')).toBe('gte.2026-10-21T12:00:00.000Z');
    vi.useRealTimers();
  });

  it('returns null when nothing matches, when the store is missing or failing', async () => {
    quiet();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));
    expect(await recentLeadReference(env, 'h', 600)).toBeNull();
    expect(await recentLeadReference({ site: 's' }, 'h', 600)).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    expect(await recentLeadReference(env, 'h', 600)).toBeNull();
  });
});

describe('saveLead and saveConversation', () => {
  it('insert snake_case rows tagged with the site', async () => {
    const fetchMock = vi.fn(async (_url: any, _init?: RequestInit) => new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await saveLead(env, { reference: 'R', phoneHash: 'ph', vendor: 'v', conversationId: 'c', contactId: 'x' });
    await saveConversation(env, {
      conversationId: 'c',
      question: 'q',
      answer: 'a',
      flagged: false,
      violations: [],
      ipHash: 'ip',
      degraded: true,
    });

    expect(String(fetchMock.mock.calls[0][0])).toBe('https://store.test/rest/v1/agent_leads');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      site: 'site-a', reference: 'R', phone_hash: 'ph', vendor: 'v', conversation_id: 'c', contact_id: 'x',
    });
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://store.test/rest/v1/agent_conversations');
    const row = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(row).toMatchObject({ site: 'site-a', conversation_id: 'c', violations: [], ip_hash: 'ip', degraded: true, flagged: false });
  });

  it('never throw when the store fails', async () => {
    quiet();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    await expect(saveLead(env, { reference: 'R', phoneHash: 'ph', contactId: 'x' })).resolves.toBe(false);
    await expect(
      saveConversation({ site: 's' }, { conversationId: 'c', question: 'q', answer: 'a', flagged: false, violations: [], ipHash: 'i', degraded: false })
    ).resolves.toBe(false);
  });
});
