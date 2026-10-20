// Characterization of the lead form's CRM traffic.
//
// tests/fixtures/lead-ghl-sequences.json was recorded from the ORIGINAL
// src/pages/api/lead.ts (before the intake core moved to src/lib/lead-intake.ts) by
// running this file with RECORD_LEAD_FIXTURES=1. Every later run replays the same
// inputs and scripted CRM answers and asserts the exact same requests (method, URL,
// headers, raw body), the same console output in the same order, and the same
// HTTP response. No request ever leaves the process: fetch is a scripted mock.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { POST } from '../src/pages/api/lead';
import { buildUpsertBody, submitLead, type LeadInput } from '../src/lib/lead-intake';

const FIXTURE = join(process.cwd(), 'tests/fixtures/lead-ghl-sequences.json');
const RECORD = process.env.RECORD_LEAD_FIXTURES === '1';
const NOW = '2026-10-20T15:00:00.000Z';
const OLD = '2026-01-01T00:00:00.000Z';
const ORIGIN = 'https://www.ifixxnc.com';
const OUTDOOR = 'QlQ4FGiqHYUgMAUwxjb1';
const HANDYMAN = 'ohDTFoWOfNfAYQ89MWEo';

type Reply = { status: number; json?: unknown; text?: string };
type Script = { upsert: Reply[]; search: Reply[]; other: Reply[] };
type Recorded = { method: string; url: string; headers: Record<string, string>; body: string | null };

interface Scenario {
  name: string;
  body: Record<string, unknown>;
  env?: { GHL_API_KEY: string; GHL_LOCATION_ID: string };
  script: Script;
}

const ok = (json: unknown): Reply => ({ status: 200, json });
const searchReply = (opportunities: unknown[]): Reply => ok({ opportunities });

const SCENARIOS: Scenario[] = [
  {
    // South Charlotte drywall landing: gclid + campaignTest + landing context. GHL
    // rejects the extended attribution once (400), the retry keeps core fields only.
    // The 2nd search finds the Handyman opp GHL created and moves it.
    name: 'drywall-landing-gclid-campaignTest',
    body: {
      firstName: 'Ana',
      lastName: 'Lopez',
      email: 'ana@example.com',
      phone: '(980) 555-0101',
      service: 'drywall-repair',
      source: 'South Charlotte Drywall Landing',
      city: 'Mint Hill',
      zipCode: '28227',
      issueType: 'Water stain on ceiling',
      safetyConcern: 'No',
      landingPage: '/lp/south-charlotte-drywall',
      campaignTest: 'ifixx_south_charlotte_service_test_2026_07',
      photoUploadStatus: 'photos-selected-browser-only',
      photoCount: 2,
      message: 'Stain about two feet wide near the bathroom.',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'sc-drywall',
      utm_term: 'drywall repair near me',
      utm_content: 'rsa-1',
      gclid: 'GCLID-abc123',
      gbraid: 'GB-1',
      page_path: '/lp/south-charlotte-drywall?utm_source=google',
      landing_page: '/repairs/drywall',
      referrer: 'https://www.google.com/',
    },
    script: {
      upsert: [{ status: 400, text: '{"message":"property url should not exist"}' }, ok({ contact: { id: 'cA' } })],
      search: [
        searchReply([]),
        searchReply([{ id: 'hA', pipelineId: HANDYMAN, status: 'open', createdAt: NOW }]),
      ],
      other: [ok({ opportunity: { id: 'hA' } })],
    },
  },
  {
    // Deck repair from the site-wide form: no attribution beyond page identity,
    // homeowner segment, a package value. Nothing found on 8 searches, so the
    // opportunity is created, then the 2nd cleanup finds and deletes a fresh
    // Handyman duplicate.
    name: 'deck-repair',
    body: {
      firstName: 'Bob',
      phone: '9805550102',
      service: 'deck-repair',
      package: 'gold',
      segment: 'homeowner',
      city: 'Fort Mill',
      message: 'Two rotten boards on the stairs.',
      page_path: '/repairs/deck-repair',
      landing_page: '/repairs/deck-repair',
    },
    script: {
      upsert: [ok({ id: 'cB' })],
      search: [
        ...Array.from({ length: 8 }, () => searchReply([])),
        searchReply([]),
        searchReply([
          { id: 'oB', pipelineId: OUTDOOR, status: 'open', createdAt: NOW },
          { id: 'hB', pipelineId: HANDYMAN, status: 'open', dateAdded: NOW },
        ]),
      ],
      other: [ok({ opportunity: { id: 'oB' } }), ok({ succeeded: true })],
    },
  },
  {
    // Property manager with company fields. Only extended attribution (url) is
    // present; GHL rejects it (422) and the retry drops attributionSource entirely.
    // An open Outdoor opp already exists, so it is already routed and the old
    // Handyman opp is left alone.
    name: 'property-manager',
    body: {
      firstName: 'Carla',
      lastName: 'Ruiz',
      email: 'carla@ruizproperties.com',
      phone: '980-555-0103',
      service: 'general-repairs',
      source: 'Property Manager Form',
      segment: 'property-manager',
      companyName: 'Ruiz Properties',
      numberOfProperties: '12',
      propertyTypes: 'Single family, Townhomes',
      bestTimeToContact: 'Mornings',
      message: 'Turnover repairs on three units.',
      package: 'diamond',
      page_path: '/for-property-managers',
    },
    script: {
      upsert: [{ status: 422, text: '{"message":"bad"}' }, ok({ contact: { id: 'cC' } })],
      search: [
        searchReply([
          { id: 'oC', pipelineId: OUTDOOR, status: 'open', createdAt: OLD },
          { id: 'hC', pipelineId: HANDYMAN, status: 'open', createdAt: OLD },
        ]),
        searchReply([
          { id: 'oC', pipelineId: OUTDOOR, status: 'open', createdAt: OLD },
          { id: 'hC', pipelineId: HANDYMAN, status: 'open', createdAt: OLD },
        ]),
      ],
      other: [],
    },
  },
  {
    // Unknown service falls back to 'other'; GHL is down (500): no retry, 500 out.
    name: 'upsert-server-error',
    body: { firstName: 'Dan', phone: '9805550104', service: 'plumbing', utm_source: 'bing', page_path: '/' },
    script: { upsert: [{ status: 500, text: 'upstream down' }], search: [], other: [] },
  },
  {
    name: 'upsert-missing-contact-id',
    body: { firstName: 'Eva', phone: '9805550105' },
    script: { upsert: [ok({ contact: {} })], search: [], other: [] },
  },
  {
    name: 'validation-missing-phone',
    body: { firstName: 'Fay', email: 'fay@example.com' },
    script: { upsert: [], search: [], other: [] },
  },
  {
    name: 'missing-env',
    body: { firstName: 'Gus', phone: '9805550107' },
    env: { GHL_API_KEY: '', GHL_LOCATION_ID: '' },
    script: { upsert: [], search: [], other: [] },
  },
];

const TEST_ENV = { GHL_API_KEY: 'test-key', GHL_LOCATION_ID: 'loc-test' };

function toResponse(r: Reply | undefined): Response {
  if (!r) throw new Error('unscripted CRM call');
  const payload = r.text ?? JSON.stringify(r.json ?? {});
  return new Response(payload, { status: r.status });
}

/** Scripted fetch that records every call. Throws on anything unscripted. */
function scriptedFetch(script: Script) {
  const queues = { upsert: [...script.upsert], search: [...script.search], other: [...script.other] };
  const calls: Recorded[] = [];
  const fn = vi.fn(async (input: any, init: RequestInit = {}) => {
    const url = String(input);
    const method = init.method || 'GET';
    calls.push({
      method,
      url,
      headers: { ...((init.headers as Record<string, string>) || {}) },
      body: typeof init.body === 'string' ? init.body : null,
    });
    if (url.endsWith('/contacts/upsert')) return toResponse(queues.upsert.shift());
    if (url.includes('/opportunities/search?')) return toResponse(queues.search.shift());
    return toResponse(queues.other.shift());
  });
  return { fn, calls };
}

function fmt(arg: unknown): string {
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  return typeof arg === 'string' ? arg : JSON.stringify(arg);
}

/** Runs a promise that sleeps on setTimeout to completion under fake timers. */
async function settle<T>(p: Promise<T>): Promise<T> {
  let done = false;
  p.then(
    () => (done = true),
    () => (done = true)
  );
  for (let i = 0; i < 200 && !done; i++) await vi.advanceTimersByTimeAsync(250);
  return p;
}

async function runPost(s: Scenario) {
  const env = s.env ?? TEST_ENV;
  vi.stubEnv('GHL_API_KEY', env.GHL_API_KEY);
  vi.stubEnv('GHL_LOCATION_ID', env.GHL_LOCATION_ID);
  const { fn, calls } = scriptedFetch(s.script);
  vi.stubGlobal('fetch', fn);
  const logs: string[][] = [];
  for (const level of ['log', 'warn', 'error', 'info'] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push([level, ...args.map(fmt)]);
    });
  }
  const request = new Request(`${ORIGIN}/api/lead`, { method: 'POST', body: JSON.stringify(s.body) });
  const res = await settle(Promise.resolve(POST({ request } as any)));
  return { status: res.status, response: await res.text(), calls, logs };
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(NOW) });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('lead form CRM traffic (pinned from the original lead.ts)', () => {
  if (RECORD) {
    it('records fixtures', async () => {
      const out: Record<string, unknown> = {};
      for (const s of SCENARIOS) out[s.name] = await runPost(s);
      mkdirSync(dirname(FIXTURE), { recursive: true });
      writeFileSync(FIXTURE, JSON.stringify(out, null, 2) + '\n');
    });
    return;
  }

  const fixtures = existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : {};

  it('has a fixture for every scenario', () => {
    expect(Object.keys(fixtures).sort()).toEqual(SCENARIOS.map((s) => s.name).sort());
  });

  for (const s of SCENARIOS) {
    it(`POST /api/lead: ${s.name}`, async () => {
      expect(await runPost(s)).toEqual(fixtures[s.name]);
    });
  }

  // The same pinned traffic, driven straight through the extracted core. Only the
  // scenarios that pass validation and have env reach the CRM. lead.ts keeps the
  // 'Lead created:' and 'API Error:' lines; every other line comes from the core.
  const leadEnv = { apiKey: TEST_ENV.GHL_API_KEY, locationId: TEST_ENV.GHL_LOCATION_ID, origin: ORIGIN };
  const reachesCrm = SCENARIOS.filter((s) => !s.env && s.body.firstName && s.body.phone);
  const coreLogs = (logs: string[][]) =>
    logs.filter(([, first]) => !first.startsWith('Lead created:') && !first.startsWith('API Error:'));

  for (const s of reachesCrm) {
    it(`buildUpsertBody: ${s.name} equals the first upsert body`, () => {
      expect(JSON.stringify(buildUpsertBody(s.body as unknown as LeadInput, leadEnv))).toBe(fixtures[s.name].calls[0].body);
    });

    it(`submitLead: ${s.name}`, async () => {
      const { fn, calls } = scriptedFetch(s.script);
      vi.stubGlobal('fetch', fn);
      const logs: string[][] = [];
      for (const level of ['log', 'warn', 'error', 'info'] as const) {
        vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
          logs.push([level, ...args.map(fmt)]);
        });
      }
      const fixture = fixtures[s.name];
      const run = settle(submitLead(s.body as unknown as LeadInput, leadEnv, new Date(NOW)));
      if (fixture.status === 200) {
        const result = await run;
        const response = JSON.parse(fixture.response);
        expect(result.contactId).toBe(response.contactId);
        expect(JSON.stringify(result.routing)).toBe(JSON.stringify(response.routing));
        expect(fixture.logs.at(-1)[1]).toBe(
          `Lead created: ${result.contactId} | Tags: ${result.tags.join(', ')} | Ifixx 2026 routing: ${result.routing.action}`
        );
      } else {
        const apiError = fixture.logs.find(([, first]: string[]) => first === 'API Error:');
        await expect(run).rejects.toThrow(apiError[2].replace(/^Error: /, ''));
      }
      expect(calls).toEqual(fixture.calls);
      expect(logs).toEqual(coreLogs(fixture.logs));
    });
  }
});
