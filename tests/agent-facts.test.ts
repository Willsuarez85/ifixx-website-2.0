import { describe, it, expect } from 'vitest';
import {
  APPROVED_FAQ,
  ASK_ANNOUNCED,
  BRAND,
  FALLBACK_ANSWER,
  VICTORIA_INTRO,
  apiDescription,
  estimateNextStep,
  renderLlmsFull,
  renderLlmsTxt,
  victoriaSystemPrompt,
  type ServiceSummary,
} from '../src/lib/agent-facts';
import { checkAnswer, DEFAULT_RULES } from '../src/lib/agent-guardrail';
import { FOUNDING_YEAR, GOOGLE_RATING, GOOGLE_REVIEW_COUNT } from '../src/lib/business-facts';

const sample: ServiceSummary[] = [
  { slug: 'drywall', title: 'Drywall Repair', pillar: 'repairs', summary: 'Holes, cracks and water-stained ceilings repaired and matched.', url: '/repairs/drywall' },
  { slug: 'painting', title: 'Painting', pillar: 'repairs', summary: 'Interior and exterior painting.', url: '/repairs/painting' },
  { slug: 'kitchen-remodeling', title: 'Kitchen Remodeling', pillar: 'remodeling', summary: 'Kitchens designed and built by the same crew.', url: '/remodeling/kitchen-remodeling' },
  { slug: 'bathroom-remodeling', title: 'Bathroom Remodeling', pillar: 'remodeling', summary: 'Bathrooms rebuilt from the studs.', url: '/remodeling/bathroom-remodeling' },
];

const guard = (t: string) => checkAnswer(t, DEFAULT_RULES);

/** Every published string inside BRAND, flattened. */
function brandStrings(): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(BRAND);
  return out;
}

describe('APPROVED_FAQ', () => {
  it('(a) has the 28 approved answers with unique ids faq-01..faq-28 in order', () => {
    expect(APPROVED_FAQ.length).toBe(28);
    expect(new Set(APPROVED_FAQ.map((f) => f.id)).size).toBe(28);
    APPROVED_FAQ.forEach((f, i) => expect(f.id).toBe(`faq-${String(i + 1).padStart(2, '0')}`));
  });

  it('(b) every answer passes the guardrail', () => {
    for (const f of APPROVED_FAQ) {
      const r = guard(f.a);
      expect(r.violations, `${f.id}: ${f.a}`).toEqual([]);
      expect(r.ok).toBe(true);
    }
  });

  it('keeps the spec wording for a few anchor answers', () => {
    const byId = Object.fromEntries(APPROVED_FAQ.map((f) => [f.id, f]));
    expect(byId['faq-01'].q).toBe('What does iFIXX do?');
    expect(byId['faq-08'].a).toBe('(980) 391-6833. Call or text.');
    expect(byId['faq-15'].a).toBe(
      'We respond the same business day, and a person schedules the visit with you. We do not offer same-day, emergency or 24-hour service.',
    );
    expect(byId['faq-28'].a).toBe('No, iFIXX does not offer financing.');
  });

  it('agrees with business-facts on rating, review count and founding year', () => {
    const byId = Object.fromEntries(APPROVED_FAQ.map((f) => [f.id, f]));
    expect(byId['faq-25'].a).toContain(`${GOOGLE_RATING.toFixed(1)} rating on Google across ${GOOGLE_REVIEW_COUNT} reviews`);
    expect(byId['faq-07'].a).toContain(`since ${FOUNDING_YEAR}`);
  });
});

describe('BRAND, VICTORIA_INTRO and FALLBACK_ANSWER', () => {
  it('carry the fixed facts', () => {
    expect(BRAND.name).toBe('iFIXX');
    expect(BRAND.legalName).toBe('iFIXX Remodeling LLC');
    expect(BRAND.tagline).toBe('From quick fixes to full transformations');
    expect(BRAND.owner).toBe('Jaime Aguilar');
    expect(BRAND.phone).toBe('(980) 391-6833');
    expect(BRAND.email).toBe('ifixx.hs@gmail.com');
    expect(BRAND.pricing).toEqual({ minimumVisit: 150, bathroomFrom: 5000, kitchenFrom: 8000 });
    expect(BRAND.notOffered).toEqual(['plumbing', 'electrical', 'HVAC']);
    expect(BRAND.proofs.length).toBeGreaterThan(0);
    expect(BRAND.estimatePolicy.length).toBeGreaterThan(0);
  });

  it('every BRAND text field passes the guardrail (notOffered is a list of trade names, checked by sentence elsewhere)', () => {
    const { notOffered: _skip, ...rest } = BRAND;
    const strings: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === 'string') strings.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(rest);
    for (const s of strings) expect(guard(s).violations, s).toEqual([]);
  });

  it('no published BRAND string uses an em or en dash', () => {
    for (const s of brandStrings()) expect(s, s).not.toMatch(/[—–]/);
  });

  it('VICTORIA_INTRO is the approved introduction and passes the guardrail', () => {
    expect(VICTORIA_INTRO).toBe(
      "I am Victoria, iFIXX's virtual assistant, available 24/7 for questions. A person handles every estimate and every visit.",
    );
    expect(guard(VICTORIA_INTRO).ok).toBe(true);
  });

  it('FALLBACK_ANSWER derives to a person, gives the phone, offers the estimate endpoint and passes the guardrail', () => {
    expect(FALLBACK_ANSWER).toContain('(980) 391-6833');
    expect(FALLBACK_ANSWER.toLowerCase()).toContain('a person');
    expect(FALLBACK_ANSWER).toContain('same business day');
    expect(FALLBACK_ANSWER).toContain('/api/agent/estimate');
    expect(FALLBACK_ANSWER).toMatch(/photos/i);
    expect(FALLBACK_ANSWER.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(2);
    expect(guard(FALLBACK_ANSWER).violations).toEqual([]);
  });

  it('estimateNextStep names the homeowner, promises only the response time and passes the guardrail', () => {
    const t = estimateNextStep('Ana');
    expect(t).toBe(
      'A person from iFIXX will call or text Ana the same business day to confirm details and give the estimate. Photos can be texted to (980) 391-6833.',
    );
    expect(guard(t).ok).toBe(true);
  });
});

describe('renderLlmsTxt', () => {
  const txt = renderLlmsTxt(sample);

  it('(c) carries the line, phone and areas, remodeling first, and none of the forbidden terms', () => {
    expect(txt.startsWith('# iFIXX\n')).toBe(true);
    expect(txt).toMatch(/^> .+/m);
    expect(txt).toContain('From quick fixes to full transformations');
    expect(txt).toContain('(980) 391-6833');
    expect(txt).toContain('Fort Mill, SC');
    expect(txt.indexOf('## Remodeling')).toBeGreaterThan(-1);
    expect(txt.indexOf('## Quick fixes')).toBeGreaterThan(txt.indexOf('## Remodeling'));
    expect(txt.toLowerCase()).not.toContain('licensed');
    expect(txt).not.toMatch(/[—–]/);
    expect(txt).not.toContain('Hamed');
    // "Charlotte, NC" only as part of "South Charlotte, NC"
    for (const m of txt.matchAll(/Charlotte, NC/g)) {
      expect(txt.slice(Math.max(0, (m.index ?? 0) - 6), m.index)).toBe('South ');
    }
    // and "Charlotte" alone never stands as a zone
    for (const m of txt.matchAll(/Charlotte/g)) {
      expect(txt.slice(Math.max(0, (m.index ?? 0) - 6), m.index)).toBe('South ');
    }
  });

  it('has the llms.txt sections in order', () => {
    const order = [
      '## About',
      '## Services',
      '## Service areas',
      '## Pricing and estimates',
      '## What iFIXX does not do',
      '## Contact',
      '## For AI assistants',
    ].map((h) => txt.indexOf(h));
    order.forEach((i) => expect(i).toBeGreaterThan(-1));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('lists each service as an absolute markdown link with its summary', () => {
    expect(txt).toContain(
      '- [Kitchen Remodeling](https://www.ifixxnc.com/remodeling/kitchen-remodeling): Kitchens designed and built by the same crew.',
    );
    expect(txt).toContain('- [Drywall Repair](https://www.ifixxnc.com/repairs/drywall): Holes, cracks and water-stained ceilings repaired and matched.');
  });

  it('links llms-full.txt and the API description', () => {
    expect(txt).toContain('https://www.ifixxnc.com/llms-full.txt');
    expect(txt).toContain('https://www.ifixxnc.com/api/agent');
  });

  it('does not announce the ask endpoint while ASK_ANNOUNCED is false', () => {
    expect(ASK_ANNOUNCED).toBe(false);
    expect(txt).not.toContain('/api/agent/ask');
  });

  it('passes the guardrail as a whole', () => {
    expect(guard(txt).violations).toEqual([]);
  });
});

describe('renderLlmsFull', () => {
  const full = renderLlmsFull(sample);

  it('(d) contains the 28 questions and answers', () => {
    for (const f of APPROVED_FAQ) {
      expect(full).toContain(f.q);
      expect(full).toContain(f.a);
    }
  });

  it('contains everything in llms.txt plus the estimate endpoint documentation', () => {
    expect(full).toContain('From quick fixes to full transformations');
    expect(full).toContain('/api/agent/estimate');
    expect(full).toContain('firstName');
  });

  it('does not document the ask endpoint while ASK_ANNOUNCED is false', () => {
    expect(full).not.toContain('/api/agent/ask');
  });

  it('has no dashes and passes the guardrail as a whole, apart from the visitor questions it quotes', () => {
    expect(full).not.toMatch(/[—–]/);
    // The approved questions repeat what visitors ask ("Is iFIXX licensed?", "Do you work in
    // NoDa?"). They are quoted, never claimed; everything else must pass.
    let body = full;
    for (const f of APPROVED_FAQ) body = body.split(f.q).join(' ');
    expect(guard(body).violations).toEqual([]);
  });
});

describe('victoriaSystemPrompt', () => {
  const prompt = victoriaSystemPrompt(sample);

  it('(e) contains the introduction and the instruction not to quote', () => {
    expect(prompt).toContain(VICTORIA_INTRO);
    expect(prompt).toMatch(/never quote a price/i);
  });

  it('carries the other hard instructions', () => {
    expect(prompt).toMatch(/only from the facts/i);
    expect(prompt).toMatch(/never confirm a date/i);
    expect(prompt).toMatch(/never book/i);
    expect(prompt).toMatch(/never say iFIXX is licensed/i);
    expect(prompt).toMatch(/1 to 3 short sentences/i);
    expect(prompt).toContain('same business day');
  });

  it('includes the facts block: phone, hours, areas, services with urls, not offered and the 28 answers', () => {
    expect(prompt).toContain(BRAND.phone);
    expect(prompt).toContain(BRAND.hoursLabel);
    expect(prompt).toContain('Indian Land, SC');
    expect(prompt).toContain('https://www.ifixxnc.com/remodeling/kitchen-remodeling');
    expect(prompt).toMatch(/plumbing, electrical or HVAC/);
    for (const f of APPROVED_FAQ) expect(prompt).toContain(f.a);
  });

  it('has no em or en dashes', () => {
    expect(prompt).not.toMatch(/[—–]/);
  });
});

describe('apiDescription', () => {
  const api = apiDescription(['drywall-repair', 'painting']) as any;

  it('(f) documents the estimate POST and the ask question field', () => {
    expect(api.endpoints.estimate.method).toBe('POST');
    expect(api.endpoints.ask.required).toContain('question');
  });

  it('documents fields, limits and examples', () => {
    expect(api.endpoints.estimate.path).toBe('/api/agent/estimate');
    expect(api.endpoints.estimate.required).toEqual(['firstName', 'phone', 'message']);
    expect(api.endpoints.estimate.optional).toEqual(['lastName', 'email', 'zipCode', 'city', 'service', 'agent']);
    expect(api.endpoints.estimate.limits.perIpPerHour).toBe(5);
    expect(api.endpoints.estimate.limits.perDay).toBe(50);
    expect(api.endpoints.ask.limits.perIpPerHour).toBe(20);
    expect(api.endpoints.ask.limits.perDay).toBe(500);
    expect(api.endpoints.estimate.fields.message).toMatch(/2000/);
    expect(api.endpoints.estimate.fields.message).toMatch(/URL/);
    expect(api.endpoints.ask.fields.question).toMatch(/1000/);
    expect(api.endpoints.ask.fields.history).toMatch(/10/);
    expect(api.endpoints.estimate.example.request.firstName).toBeTruthy();
    expect(api.endpoints.estimate.example.response.success).toBe(true);
    expect(api.endpoints.ask.example.request.question).toBeTruthy();
    expect(api.serviceKeys).toEqual(['drywall-repair', 'painting']);
    expect(api.endpoints.estimate.fields.service).toMatch(/serviceKeys/);
  });

  it('defaults serviceKeys to an empty list and serializes cleanly', () => {
    const d = apiDescription() as any;
    expect(d.serviceKeys).toEqual([]);
    const json = JSON.stringify(d);
    expect(json).not.toMatch(/[—–]/);
    expect(json.toLowerCase()).not.toContain('licensed');
  });
});
