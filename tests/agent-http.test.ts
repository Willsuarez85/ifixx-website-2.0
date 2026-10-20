import { describe, expect, it } from 'vitest';
import { clientIp, ipHash, jsonResponse, normalizePhone, optionsResponse, readJson } from '../src/lib/agent-http';

const post = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/agent/estimate', { method: 'POST', body, headers });

describe('normalizePhone', () => {
  it('accepts human formats and returns 10 digits', () => {
    for (const raw of ['(980) 391-6833', '980-391-6833', '+1 980 391 6833', '9803916833', '+19803916833', '980.391.6833', '1-980-391-6833']) {
      expect(normalizePhone(raw), raw).toBe('9803916833');
    }
  });

  it('rejects 7 digits, letters, too many digits and non-strings', () => {
    for (const raw of ['391-6833', '980-391-683x', 'call me', '980 391 6833 ext 2', '298039168330', '', '0803916833']) {
      expect(normalizePhone(raw), raw).toBeNull();
    }
    expect(normalizePhone(9803916833 as any)).toBeNull();
  });
});

describe('readJson', () => {
  it('parses a JSON body', async () => {
    expect(await readJson(post('{"a":1}'))).toEqual({ ok: true, data: { a: 1 } });
  });

  it('rejects a non-JSON or empty body with a clear error', async () => {
    const bad = await readJson(post('firstName=Ana'));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toMatch(/JSON/);
    expect((await readJson(post(null))).ok).toBe(false);
  });

  it('rejects a body over the limit, measured from the text', async () => {
    const big = JSON.stringify({ message: 'x'.repeat(20 * 1024) });
    const r = await readJson(post(big));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/16 KB/);
    // A lying Content-Length does not let it through either.
    const lying = await readJson(post(big, { 'content-length': '10' }));
    expect(lying.ok).toBe(false);
  });
});

describe('request helpers', () => {
  it('clientIp takes the first x-forwarded-for value', () => {
    expect(clientIp(post('{}', { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
    expect(clientIp(post('{}'))).toBe('unknown');
  });

  it('ipHash is 16 hex chars and stable', () => {
    expect(ipHash('203.0.113.7')).toMatch(/^[0-9a-f]{16}$/);
    expect(ipHash('203.0.113.7')).toBe(ipHash('203.0.113.7'));
    expect(ipHash('203.0.113.7')).not.toBe(ipHash('203.0.113.8'));
  });

  it('jsonResponse and optionsResponse carry CORS and no-store', async () => {
    const r = jsonResponse(201, { ok: 1 });
    expect(r.status).toBe(201);
    expect(r.headers.get('access-control-allow-origin')).toBe('*');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('content-type')).toMatch(/application\/json/);
    expect(await r.json()).toEqual({ ok: 1 });
    const o = optionsResponse();
    expect(o.status).toBe(204);
    expect(o.headers.get('access-control-allow-methods')).toMatch(/POST/);
    expect(o.headers.get('access-control-allow-headers')).toMatch(/content-type/i);
  });
});
