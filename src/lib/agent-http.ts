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
  maxBytes = 16384
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
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel().catch(() => {});
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

/** First address in x-forwarded-for, or 'unknown'. */
export function clientIp(request: Request): string {
  const first = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  return first || 'unknown';
}

/** sha256 hex of the value, full length. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** sha256 of the IP, first 16 hex characters. The raw IP is never stored. */
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
 * Server configuration for the agent endpoints. Each name is read statically from
 * import.meta.env (as src/pages/api/lead.ts does) with process.env as runtime fallback.
 */
export function agentEnv(defaultSite: string) {
  const pick = (a: string | undefined, b: string | undefined) => (a ? a : b) || undefined;
  const proc: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {};
  return {
    ghlApiKey: pick(import.meta.env.GHL_API_KEY, proc.GHL_API_KEY),
    ghlLocationId: pick(import.meta.env.GHL_LOCATION_ID, proc.GHL_LOCATION_ID),
    supabaseUrl: pick(import.meta.env.SUPABASE_URL, proc.SUPABASE_URL),
    supabaseKey: pick(import.meta.env.SUPABASE_SERVICE_KEY, proc.SUPABASE_SERVICE_KEY),
    site: pick(import.meta.env.AGENT_SITE_ID, proc.AGENT_SITE_ID) || defaultSite,
  };
}
