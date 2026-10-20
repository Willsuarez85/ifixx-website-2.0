import type { APIRoute } from 'astro';
import { randomInt } from 'node:crypto';
import { domainToASCII } from 'node:url';
import {
  AGENT_SERVICE_KEYS,
  AGENT_SITE_ID_DEFAULT,
  BRAND,
  LIMITS,
  estimateNextStep,
  estimateRoutingPendingNextStep,
} from '../../../lib/agent-facts';
import { agentEnv, clientIp, ipHash, jsonResponse, normalizePhone, optionsResponse, readJson, sha256Hex } from '../../../lib/agent-http';
import { completeEstimate, consumeRollingLimit, releaseEstimate, reserveEstimate, type StoreEnv } from '../../../lib/agent-store';
import { CONTACT_ONLY_ROUTING_ACTION, LeadIntakeError, submitLead } from '../../../lib/lead-intake';

/**
 * POST /api/agent/estimate: an AI assistant leaves an estimate request on behalf of a
 * homeowner. It reaches the CRM through the same intake as the website form, tagged as
 * coming from an assistant. Generic: every site-specific string comes from agent-facts.
 */
export const prerender = false;

const SHORT_FIELD_MAX = LIMITS.firstNameMax;
const EMAIL_MAX = 254;
// Agent-supplied free text is sent to GHL only as plain text. Reject link-shaped input;
// downstream CRM fields/workflows must not render this text as HTML or a template.
const URL_SCHEME_IN_TEXT = /(?:\b[a-z][a-z0-9+.-]{1,31}:(?:\/\/|[^\s])|\bwww\.)/iu;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP = /^\d{5}(-\d{4})?$/;
const CONVERSATION_ID = /^[A-Za-z0-9._:-]+$/;
const REFERENCE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';
const REFERENCE_LENGTH = 8;
const AGENT_CRM_TOTAL_TIMEOUT_MS = 8000;

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
const clean = (s: string) => s
  .normalize('NFKC')
  // WHATWG/IDNA treat these as domain-label separators. Canonicalize them so a
  // Unicode dot cannot hide a bare domain from the text-field check below.
  .replace(/[\u3002\uFF0E\uFF61]/g, '.')
  .replace(/[\s\u0000-\u001f\u007f]+/g, ' ')
  .trim();

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

const noUrls = (field: string) => `${field} must not contain URLs, URL schemes or domain names.`;

const ASCII_DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const ASCII_TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i;

/** Uses Node's IDNA conversion, then applies hostname label and TLD constraints. */
function containsDomain(value: string): boolean {
  const candidates = value.split(/[\s,;\u3001\p{Ps}\p{Pe}\p{Pi}\p{Pf}"']+/u).filter(Boolean);
  for (const raw of candidates) {
    let candidate = raw;
    const at = candidate.lastIndexOf('@');
    if (at >= 0) candidate = candidate.slice(at + 1);
    candidate = candidate.split(/[/?#]/, 1)[0].replace(/[.!?]+$/u, '');
    const colon = candidate.lastIndexOf(':');
    if (colon > candidate.lastIndexOf('.')) candidate = candidate.slice(0, colon);
    if (!candidate.includes('.')) continue;

    const ascii = domainToASCII(candidate).toLowerCase();
    if (!ascii) {
      // Invalid IDNA containing a symbolic or letter TLD is still link-shaped input.
      const suffix = candidate.split('.').at(-1) ?? '';
      if (/^[\p{L}\p{M}\p{S}]{2,63}$/u.test(suffix)) return true;
      continue;
    }
    if (ascii.length > 253) continue;
    const labels = ascii.split('.');
    if (labels.length < 2 || !labels.every((label) => ASCII_DOMAIN_LABEL.test(label))) continue;
    if (ASCII_TLD.test(labels[labels.length - 1])) return true;
  }
  return false;
}

const containsLink = (value: string): boolean => URL_SCHEME_IN_TEXT.test(value) || containsDomain(value);

type Validated = { ok: true; value: EstimateRequest } | { ok: false; error: string };

function optionalText(
  data: Record<string, unknown>,
  field: string,
  max: number,
  rejectUrls = true
): { error?: string; value?: string } {
  const v = data[field];
  if (v === undefined || v === null || v === '') return {};
  if (typeof v !== 'string') return { error: `${field} must be a string.` };
  const value = clean(v);
  if (value.length > max) return { error: `${field} must be up to ${max} characters.` };
  if (rejectUrls && containsLink(value)) return { error: noUrls(field) };
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
  if (containsLink(firstName)) return { ok: false, error: noUrls('firstName') };

  const phone = normalizePhone(d.phone as string);
  if (!phone) {
    return { ok: false, error: 'phone is required: a US phone number with 10 digits, for example (XXX) XXX-XXXX or +1 XXX XXX XXXX.' };
  }

  const message = typeof d.message === 'string' ? clean(d.message) : '';
  if (!message || message.length > LIMITS.messageMax) {
    return { ok: false, error: `message is required, 1 to ${LIMITS.messageMax} characters.` };
  }
  if (containsLink(message)) return { ok: false, error: noUrls('message') };

  const lastName = optionalText(d, 'lastName', SHORT_FIELD_MAX);
  const city = optionalText(d, 'city', SHORT_FIELD_MAX);
  const email = optionalText(d, 'email', EMAIL_MAX, false);
  const zipCode = optionalText(d, 'zipCode', SHORT_FIELD_MAX, false);
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
      const name = clean(a.name);
      if (name.length > SHORT_FIELD_MAX) return { ok: false, error: `agent.name must be up to ${SHORT_FIELD_MAX} characters.` };
      if (containsLink(name)) return { ok: false, error: noUrls('agent.name') };
      agentName = name || undefined;
    }
    if (typeof a.vendor === 'string' && a.vendor.trim()) {
      const vendor = clean(a.vendor);
      if (containsLink(vendor)) return { ok: false, error: noUrls('agent.vendor') };
      vendorGiven = true;
      slug = vendorSlug(vendor);
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

    if (!store.url || !store.key) {
      console.error('agent estimate: store not configured, requests paused');
      return failure(503, 'temporarily_unavailable');
    }

    const phoneHash = sha256Hex(v.phone);
    const payloadHash = sha256Hex(JSON.stringify([
      v.firstName,
      v.lastName ?? '',
      v.email ?? '',
      v.zipCode ?? '',
      v.city ?? '',
      v.phone,
      v.message,
      v.service,
      v.vendorSlug,
      v.conversationId ?? '',
    ]));
    const ipLimit = await consumeRollingLimit(
      store,
      `estimate:ip:${ipHash(clientIp(request))}`,
      LIMITS.estimate.perIpPerHour,
      LIMITS.ipWindowSeconds
    );
    if (ipLimit === null) return failure(503, 'temporarily_unavailable');
    if (!ipLimit.allowed) return failure(429, 'rate_limited');
    if (!env.ghlApiKey || !env.ghlLocationId) {
      console.error('agent estimate: missing GHL configuration');
      return failure(502, 'crm_unavailable');
    }

    const reference = makeReference();
    const reservation = await reserveEstimate(store, {
      payloadHash,
      phoneHash,
      reference,
      withinSeconds: LIMITS.estimate.duplicateWindowSeconds,
      vendor: v.vendorSlug,
      conversationId: v.conversationId,
    });
    if (!reservation) return failure(503, 'temporarily_unavailable');
    if (!reservation.acquired) {
      if (reservation.status === 'pending') {
        return jsonResponse(202, {
          success: false,
          error: 'request_in_progress',
          reference: reservation.reference,
          retryAfterSeconds: 5,
        });
      }
      const routingPending = reservation.routingStatus === 'incomplete';
      return jsonResponse(200, {
        success: true,
        reference: reservation.reference,
        nextStep: routingPending ? estimateRoutingPendingNextStep() : estimateNextStep(v.firstName),
        duplicate: true,
        ...(routingPending ? { routingPending: true } : {}),
      });
    }

    const dayLimit = await consumeRollingLimit(
      store,
      'estimate:day',
      LIMITS.estimate.perDay,
      LIMITS.dayWindowSeconds
    );
    if (dayLimit === null) {
      await releaseEstimate(store, { payloadHash, reference });
      return failure(503, 'temporarily_unavailable');
    }
    if (!dayLimit.allowed) {
      await releaseEstimate(store, { payloadHash, reference });
      return failure(503, 'temporarily_unavailable');
    }

    let contactId: string;
    let routingIncomplete = false;
    try {
      const intake = await submitLead(
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
        { apiKey: env.ghlApiKey, locationId: env.ghlLocationId, origin: new URL(request.url).origin },
        new Date(),
        { totalTimeoutMs: AGENT_CRM_TOTAL_TIMEOUT_MS, acceptContactOnly: true }
      );
      contactId = intake.contactId;
      routingIncomplete = intake.routing.action === CONTACT_ONLY_ROUTING_ACTION;
    } catch (err) {
      if (err instanceof LeadIntakeError && err.retrySafe) {
        await releaseEstimate(store, { payloadHash, reference });
        console.error('agent estimate: CRM rejected contact before writing');
      } else {
        // A timed-out or malformed upsert may already have written the contact. Keep the
        // pending reservation so an immediate retry cannot create a second CRM lead.
        console.error('agent estimate: CRM outcome unknown; reservation retained');
      }
      return failure(502, 'crm_unavailable');
    }

    const completionRecorded = await completeEstimate(store, {
      payloadHash,
      reference,
      contactId,
      routingStatus: routingIncomplete ? 'incomplete' : 'complete',
    });
    const reconciliationPending = !completionRecorded;
    if (reconciliationPending) {
      // The CRM contact is confirmed and includes this reference in Project Notes. Keep
      // the reservation pending so operations can find it without allowing a duplicate.
      console.error('agent estimate: completion record failed; reconcile pending reference');
    }

    console.log(`Agent lead: ref ${reference} | agent:${v.vendorSlug} | service ${v.service}`);
    return jsonResponse(200, {
      success: true,
      reference,
      nextStep: routingIncomplete || reconciliationPending
        ? estimateRoutingPendingNextStep()
        : estimateNextStep(v.firstName),
      ...(routingIncomplete ? { routingPending: true } : {}),
      ...(reconciliationPending ? { reconciliationPending: true } : {}),
    });
  } catch {
    console.error('agent estimate: unexpected error');
    return failure(502, 'crm_unavailable');
  }
};

export const OPTIONS: APIRoute = () => optionsResponse();
