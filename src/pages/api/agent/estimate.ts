import type { APIRoute } from 'astro';
import { randomInt } from 'node:crypto';
import { AGENT_SERVICE_KEYS, AGENT_SITE_ID_DEFAULT, BRAND, LIMITS, estimateNextStep } from '../../../lib/agent-facts';
import { agentEnv, clientIp, ipHash, jsonResponse, normalizePhone, optionsResponse, readJson, sha256Hex } from '../../../lib/agent-http';
import { bump, recentLeadReference, saveLead, type StoreEnv } from '../../../lib/agent-store';
import { submitLead } from '../../../lib/lead-intake';

/**
 * POST /api/agent/estimate: an AI assistant leaves an estimate request on behalf of a
 * homeowner. It reaches the CRM through the same intake as the website form, tagged as
 * coming from an assistant. Generic: every site-specific string comes from agent-facts.
 */
export const prerender = false;

const SHORT_FIELD_MAX = LIMITS.firstNameMax;
const EMAIL_MAX = 254;
const URL_IN_TEXT = /https?:\/\/|www\./i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP = /^\d{5}(-\d{4})?$/;
const CONVERSATION_ID = /^[A-Za-z0-9._:-]+$/;
const REFERENCE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';
const REFERENCE_LENGTH = 8;

interface EstimateRequest {
  firstName: string;
  lastName?: string;
  email?: string;
  zipCode?: string;
  city?: string;
  phone: string;
  message: string;
  service: string;
  agentName?: string;
  vendorGiven: boolean;
  vendorSlug: string;
  conversationId?: string;
}

const bad = (error: string) => jsonResponse(400, { success: false, error });
const failure = (status: number, error: string) => jsonResponse(status, { success: false, error, phone: BRAND.phone });

/** Collapses whitespace and control characters to single spaces and trims. */
const clean = (s: string) => s.replace(/[\s\u0000-\u001f\u007f]+/g, ' ').trim();

/** 'OpenAI ChatGPT!' -> 'openai-chatgpt'; empty -> 'unknown'. */
function vendorSlug(raw: unknown): string {
  const slug = String(typeof raw === 'string' ? raw : '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, LIMITS.vendorSlugMax)
    .replace(/^-+|-+$/g, '');
  return slug || 'unknown';
}

function makeReference(): string {
  let out = '';
  for (let i = 0; i < REFERENCE_LENGTH; i++) out += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return out;
}

const noUrls = (field: string) => `${field} must not contain URLs (http://, https:// or www.).`;

type Validated = { ok: true; value: EstimateRequest } | { ok: false; error: string };

function optionalText(data: Record<string, unknown>, field: string, max: number): { error?: string; value?: string } {
  const v = data[field];
  if (v === undefined || v === null || v === '') return {};
  if (typeof v !== 'string') return { error: `${field} must be a string.` };
  const value = clean(v);
  if (value.length > max) return { error: `${field} must be up to ${max} characters.` };
  if (URL_IN_TEXT.test(value)) return { error: noUrls(field) };
  return value ? { value } : {};
}

function validate(data: unknown): Validated {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'Body must be a JSON object with firstName, phone and message.' };
  }
  const d = data as Record<string, unknown>;

  const firstName = typeof d.firstName === 'string' ? clean(d.firstName) : '';
  if (!firstName || firstName.length > LIMITS.firstNameMax) {
    return { ok: false, error: `firstName is required, 1 to ${LIMITS.firstNameMax} characters.` };
  }
  if (URL_IN_TEXT.test(firstName)) return { ok: false, error: noUrls('firstName') };

  const phone = normalizePhone(d.phone as string);
  if (!phone) {
    return { ok: false, error: 'phone is required: a US phone number with 10 digits, for example (XXX) XXX-XXXX or +1 XXX XXX XXXX.' };
  }

  const message = typeof d.message === 'string' ? d.message.trim() : '';
  if (!message || message.length > LIMITS.messageMax) {
    return { ok: false, error: `message is required, 1 to ${LIMITS.messageMax} characters.` };
  }
  if (URL_IN_TEXT.test(message)) return { ok: false, error: noUrls('message') };

  const lastName = optionalText(d, 'lastName', SHORT_FIELD_MAX);
  const city = optionalText(d, 'city', SHORT_FIELD_MAX);
  const email = optionalText(d, 'email', EMAIL_MAX);
  const zipCode = optionalText(d, 'zipCode', SHORT_FIELD_MAX);
  for (const f of [lastName, city, email, zipCode]) if (f.error) return { ok: false, error: f.error };
  if (email.value && !EMAIL.test(email.value)) return { ok: false, error: 'email is not a valid email address.' };
  if (zipCode.value && !ZIP.test(zipCode.value)) return { ok: false, error: 'zipCode must be a 5-digit US ZIP code.' };

  // Only the published agent keys: emergency, urgent and legacy SERVICE_TAGS keys (and
  // inherited names such as '__proto__') are recorded as other.
  const service = typeof d.service === 'string' && AGENT_SERVICE_KEYS.includes(d.service) ? d.service : 'other';

  let agentName: string | undefined;
  let vendorGiven = false;
  let conversationId: string | undefined;
  let slug = 'unknown';
  if (d.agent !== undefined && d.agent !== null) {
    if (typeof d.agent !== 'object' || Array.isArray(d.agent)) {
      return { ok: false, error: 'agent must be an object: { "name", "vendor", "conversationId" }.' };
    }
    const a = d.agent as Record<string, unknown>;
    if (typeof a.name === 'string') {
      if (URL_IN_TEXT.test(a.name)) return { ok: false, error: noUrls('agent.name') };
      agentName = clean(a.name).slice(0, SHORT_FIELD_MAX) || undefined;
    }
    if (typeof a.vendor === 'string' && a.vendor.trim()) {
      if (URL_IN_TEXT.test(a.vendor)) return { ok: false, error: noUrls('agent.vendor') };
      vendorGiven = true;
      slug = vendorSlug(a.vendor);
    }
    if (a.conversationId !== undefined && a.conversationId !== null && a.conversationId !== '') {
      const id = typeof a.conversationId === 'string' ? a.conversationId.trim() : '';
      if (!id || id.length > LIMITS.conversationIdMax || !CONVERSATION_ID.test(id)) {
        return {
          ok: false,
          error: `agent.conversationId must be up to ${LIMITS.conversationIdMax} characters (letters, digits, . _ : -).`,
        };
      }
      conversationId = id;
    }
  }

  return {
    ok: true,
    value: {
      firstName,
      lastName: lastName.value,
      email: email.value,
      zipCode: zipCode.value,
      city: city.value,
      phone,
      message,
      service,
      agentName,
      vendorGiven,
      vendorSlug: slug,
      conversationId,
    },
  };
}

/** Opens Project Notes: who sent it, the reference the assistant got back, the conversation. */
function notesPrefix(v: EstimateRequest, reference: string): string {
  const who = ['Submitted by AI assistant', v.agentName, v.vendorGiven ? `(${v.vendorSlug})` : undefined]
    .filter(Boolean)
    .join(' ');
  return [
    `${who} on behalf of the homeowner.`,
    `Reference: ${reference}`,
    ...(v.conversationId ? [`Conversation: ${v.conversationId}`] : []),
  ].join('\n');
}

export const POST: APIRoute = async ({ request }) => {
  const parsed = await readJson(request, LIMITS.bodyMaxBytes);
  if (!parsed.ok) return bad(parsed.error);
  const checked = validate(parsed.data);
  if (!checked.ok) return bad(checked.error);
  const v = checked.value;

  try {
    const env = agentEnv(AGENT_SITE_ID_DEFAULT);
    const store: StoreEnv = { url: env.supabaseUrl, key: env.supabaseKey, site: env.site };

    // Without a configured store there are no rate limits and no daily cap. In Production
    // that would be an unlimited path into the CRM, so the endpoint pauses instead. A store
    // that is configured but failing still fails open (counters -1, no dedup).
    if ((!store.url || !store.key) && process.env.VERCEL_ENV === 'production') {
      console.error('agent estimate: store not configured in production, requests paused');
      return failure(503, 'temporarily_unavailable');
    }

    // Counters answer -1 and the dedup lookup answers null when the store is down: the
    // request goes through (agent-store logs 'agent-store:unprotected' once).
    // The phone hash is pseudonymization, not anonymity: a known phone can be hashed and matched.
    const phoneHash = sha256Hex(v.phone);
    const nextStep = estimateNextStep(v.firstName);
    // The IP limit covers dedup hits too (a hit returns a reference); the daily budget is
    // spent only by requests that can reach the CRM.
    const [ipCount, previous] = await Promise.all([
      bump(store, `estimate:ip:${ipHash(clientIp(request))}`, LIMITS.ipWindowSeconds),
      recentLeadReference(store, phoneHash, LIMITS.estimate.duplicateWindowSeconds),
    ]);
    if (ipCount > LIMITS.estimate.perIpPerHour) return failure(429, 'rate_limited');
    if (previous) {
      return jsonResponse(200, { success: true, reference: previous, nextStep, duplicate: true });
    }
    if (!env.ghlApiKey || !env.ghlLocationId) {
      console.error('agent estimate: missing GHL configuration');
      return failure(502, 'crm_unavailable');
    }

    if ((await bump(store, 'estimate:day', LIMITS.dayWindowSeconds)) > LIMITS.estimate.perDay) {
      return failure(503, 'temporarily_unavailable');
    }

    // Generated before the CRM call so it is written into Project Notes, where staff can
    // match it with what the assistant told the homeowner.
    const reference = makeReference();
    let contactId: string;
    try {
      ({ contactId } = await submitLead(
        {
          firstName: v.firstName,
          lastName: v.lastName,
          email: v.email,
          phone: v.phone,
          service: v.service,
          message: v.message,
          source: 'AI Assistant',
          city: v.city,
          zipCode: v.zipCode,
          extraTags: [...new Set(['ai-assistant-lead', `agent:${v.vendorSlug}`])],
          notesPrefix: notesPrefix(v, reference),
        },
        { apiKey: env.ghlApiKey, locationId: env.ghlLocationId, origin: new URL(request.url).origin }
      ));
    } catch (err) {
      console.error('agent estimate: CRM intake failed:', err);
      return failure(502, 'crm_unavailable');
    }

    await saveLead(store, {
      reference,
      phoneHash,
      vendor: v.vendorSlug,
      conversationId: v.conversationId,
      contactId,
    });

    console.log(`Agent lead: ref ${reference} | agent:${v.vendorSlug} | service ${v.service}`);
    return jsonResponse(200, { success: true, reference, nextStep });
  } catch (err) {
    console.error('agent estimate: unexpected error:', err);
    return failure(502, 'crm_unavailable');
  }
};

export const OPTIONS: APIRoute = () => optionsResponse();
