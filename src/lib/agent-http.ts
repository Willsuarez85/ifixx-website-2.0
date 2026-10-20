/**
 * HTTP helpers shared by the AI-agent endpoints (/api/agent/*). Generic: nothing here
 * is specific to one site.
 */
import { createHash } from 'node:crypto';

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/** JSON response with open CORS and no caching. */
export function jsonResponse(status: number, body: object): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/** CORS preflight answer. */
export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' } });
}

/**
 * Reads the body as JSON, at most maxBytes. The size is measured on the bytes actually
 * read (Content-Length is only a shortcut for an honest oversized body); reading stops
 * as soon as the limit is passed. Never throws.
 */
export async function readJson(
  request: Request,
  maxBytes = 16384,
  timeoutMs = 2000
): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  const tooLarge = { ok: false as const, error: `Body too large: the limit is ${Math.round(maxBytes / 1024)} KB of JSON.` };
  const notJson = { ok: false as const, error: 'Body must be valid JSON (Content-Type: application/json).' };

  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge;

  let text = '';
  try {
    if (request.body) {
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
          void reader.cancel().catch(() => {});
          return { ok: false, error: 'Body read timed out.' };
        }
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('body_timeout')), remaining);
        });
        let chunk: ReadableStreamReadResult<Uint8Array>;
        try {
          chunk = await Promise.race([reader.read(), timeout]);
        } catch (err) {
          if ((err as Error)?.message === 'body_timeout') {
            void reader.cancel().catch(() => {});
            return { ok: false, error: 'Body read timed out.' };
          }
          throw err;
        } finally {
          clearTimeout(timer);
        }
        const { done, value } = chunk;
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          void reader.cancel().catch(() => {});
          return tooLarge;
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.byteLength;
      }
      text = new TextDecoder().decode(bytes);
    }
  } catch {
    return notJson;
  }

  if (!text.trim()) return notJson;
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return notJson;
  }
}

/**
 * Client address: x-vercel-forwarded-for (set by Vercel, not spoofable through it), then
 * x-real-ip, then the first x-forwarded-for value, else 'unknown'.
 */
export function clientIp(request: Request): string {
  const first = (name: string) => (request.headers.get(name) || '').split(',')[0].trim();
  return first('x-vercel-forwarded-for') || first('x-real-ip') || first('x-forwarded-for') || 'unknown';
}

/** sha256 hex of the value, full length. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * sha256 of the IP, first 16 hex characters. Pseudonymization, not anonymity: the raw
 * IP is never stored, but a known IP can be hashed and matched.
 */
export function ipHash(ip: string): string {
  return sha256Hex(ip).slice(0, 16);
}

/**
 * US phone to 10 digits. Accepts the usual human formats ((980) 391-6833, 980-391-6833,
 * 980.391.6833, +1 980 391 6833). Anything with letters or other symbols, fewer or more
 * digits, or an area code starting with 0 or 1 returns null.
 */
export function normalizePhone(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  if (!/^[\d\s().+-]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (!/^[2-9]\d{9}$/.test(digits)) return null;
  return digits;
}

/**
 * Server configuration for the agent endpoints, read from process.env at call time.
 * Secrets never go through import.meta.env: Astro inlines those values into the server
 * bundle at build time. Only AGENT_SITE_ID (not a secret) keeps the import.meta fallback.
 * Empty strings count as missing.
 */
export function agentEnv(defaultSite: string) {
  const proc: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {};
  const read = (name: string) => proc[name] || undefined;
  return {
    ghlApiKey: read('GHL_API_KEY'),
    ghlLocationId: read('GHL_LOCATION_ID'),
    supabaseUrl: read('SUPABASE_URL'),
    supabaseKey: read('SUPABASE_SERVICE_KEY'),
    site: read('AGENT_SITE_ID') || import.meta.env.AGENT_SITE_ID || defaultSite,
  };
}
