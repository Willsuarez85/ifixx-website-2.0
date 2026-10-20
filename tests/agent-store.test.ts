import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bump,
  completeEstimate,
  releaseEstimate,
  reserveEstimate,
  saveConversation,
  type StoreEnv,
} from '../src/lib/agent-store';

const env: StoreEnv = { url: 'https://store.test', key: 'service-key', site: 'site-a' };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const quiet = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('bump', () => {
  it('returns the count and sends the scoped RPC arguments', async () => {
    const fetchMock = vi.fn(async () => new Response('3', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await bump(env, 'estimate:day', 86400)).toBe(3);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://store.test/rest/v1/rpc/bump_counter');
    expect(JSON.parse(String(init?.body))).toEqual({ p_site: 'site-a', p_key: 'estimate:day', p_window_seconds: 86400 });
    const headers = new Headers(init?.headers);
    expect(headers.get('apikey')).toBe('service-key');
    expect(headers.get('authorization')).toBe('Bearer service-key');
  });

  it('returns null when configuration, transport, status or body is invalid', async () => {
    quiet();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await bump({ site: 'site-a' }, 'k', 60)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    expect(await bump({ ...env }, 'k', 60)).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('private detail', { status: 503 })));
    expect(await bump({ ...env }, 'k', 60)).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not-a-number', { status: 200 })));
    expect(await bump({ ...env }, 'k', 60)).toBeNull();
  });
});

describe('estimate reservation RPCs', () => {
  it('reserves an exact payload and sends only hashes plus bounded metadata', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ acquired: true, reference: 'ABCD2345', reservation_status: 'pending' }]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(reserveEstimate(env, {
      payloadHash: 'payload-hash', phoneHash: 'phone-hash', reference: 'ABCD2345', withinSeconds: 600, vendor: 'v', conversationId: 'c',
    })).resolves.toEqual({ acquired: true, reference: 'ABCD2345', status: 'pending' });
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://store.test/rest/v1/rpc/reserve_agent_estimate');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      p_site: 'site-a', p_payload_hash: 'payload-hash', p_phone_hash: 'phone-hash', p_reference: 'ABCD2345',
      p_window_seconds: 600, p_vendor: 'v', p_conversation_id: 'c',
    });
  });

  it('returns the existing reference for an atomically detected duplicate', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ acquired: false, reference: 'OLD23456', reservation_status: 'completed' }]), { status: 200 })));
    await expect(reserveEstimate(env, {
      payloadHash: 'p', phoneHash: 'h', reference: 'NEW23456', withinSeconds: 600,
    })).resolves.toEqual({ acquired: false, reference: 'OLD23456', status: 'completed' });
  });

  it('completes and releases by site, payload hash and reference', async () => {
    const fetchMock = vi.fn(async () => new Response('true', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await completeEstimate(env, { payloadHash: 'p', reference: 'R', contactId: 'C' })).toBe(true);
    expect(await releaseEstimate(env, { payloadHash: 'p', reference: 'R' })).toBe(true);
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toEqual([
      'https://store.test/rest/v1/rpc/complete_agent_estimate',
      'https://store.test/rest/v1/rpc/release_agent_estimate',
    ]);
  });

  it('returns null or false on store failure', async () => {
    quiet();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    await expect(reserveEstimate(env, { payloadHash: 'p', phoneHash: 'h', reference: 'R', withinSeconds: 600 })).resolves.toBeNull();
    await expect(completeEstimate(env, { payloadHash: 'p', reference: 'R', contactId: 'C' })).resolves.toBe(false);
    await expect(releaseEstimate(env, { payloadHash: 'p', reference: 'R' })).resolves.toBe(false);
  });
});

describe('conversation logging and alarms', () => {
  it('inserts a snake_case conversation row tagged with the site', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await saveConversation(env, {
      conversationId: 'c', question: 'q', answer: 'a', flagged: false, violations: [], ipHash: 'ip', degraded: true,
    })).toBe(true);
    const row = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(row).toMatchObject({ site: 'site-a', conversation_id: 'c', violations: [], ip_hash: 'ip', degraded: true, flagged: false });
  });

  it('logs one alarm per StoreEnv and never includes an external response body', async () => {
    const warn = quiet();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => new Response('sensitive upstream body', { status: 503 })));
    const perRequest = { ...env };
    await bump(perRequest, 'a', 60);
    await bump(perRequest, 'b', 60);
    expect(error.mock.calls.filter((c) => c[0] === 'agent-store:unprotected')).toHaveLength(1);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('sensitive upstream body');
  });
});
