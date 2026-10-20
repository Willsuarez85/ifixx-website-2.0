import { describe, it, expect } from 'vitest';
import { checkAnswer, DEFAULT_RULES } from '../src/lib/agent-guardrail';

const check = (t: string) => checkAnswer(t, DEFAULT_RULES);
const has = (t: string, label: string) => check(t).violations.some((v) => v.includes(label));

// The 28 approved answers of spec section 8 (Task 2 moves them to agent-facts.ts).
const APPROVED_ANSWERS: string[] = [
  'iFIXX is the crew South Charlotte homeowners call for quick fixes and home transformations. We handle small repairs (drywall, painting, doors and windows, deck and fence repair, carpentry) and full remodels (kitchens, bathrooms, flooring, new decks and screened porches). From quick fixes to full transformations, with the same people.',
  'iFIXX is a remodeling company that also takes the small jobs. Most homeowners meet us through a quick fix and call the same crew when they are ready for the kitchen, the bathroom or the deck.',
  'South Charlotte, NC and the towns around it: Ballantyne, Matthews, Mint Hill, Pineville, Waxhaw and Weddington in North Carolina, and Fort Mill and Indian Land in South Carolina.',
  'Our service area is South Charlotte and the towns around it: Ballantyne, Matthews, Mint Hill, Pineville, Waxhaw and Weddington in North Carolina, and Fort Mill and Indian Land in South Carolina. For an address outside that area, call (980) 391-6833 and a person will tell you if we can take it.',
  'Yes. iFIXX is fully insured and the crew comes uniformed.',
  'iFIXX is a fully insured remodeling and handyman company. For questions about licensing for a specific project, call (980) 391-6833 and a person will answer.',
  'Jaime Aguilar is the owner and he answers directly. iFIXX is a family-owned company working in South Charlotte since 2019.',
  '(980) 391-6833. Call or text.',
  'Monday to Saturday, 8:30 AM to 5:30 PM. Closed on Sunday.',
  'For small repairs, text photos and a short description to (980) 391-6833 or send them through the website, and a person calls you back with the estimate the same business day. For remodeling (kitchens, bathrooms, new decks, porches), we visit in person and send a written estimate within 48 hours of the visit. Estimates are free.',
  'No. Prices come from a person after seeing photos or the home. The public starting points are: bathroom remodels from $5,000, kitchen remodels from $8,000, and a $150 minimum for any repair visit. Everything else is a free estimate.',
  'Bathroom remodels start at $5,000. The written estimate comes after an in-person visit, with everything included and no surprises. Call or text (980) 391-6833 to schedule the visit.',
  'Kitchen remodels start at $8,000. The written estimate comes after an in-person visit, with everything included and no surprises. Call or text (980) 391-6833 to schedule the visit.',
  'Yes. The minimum for any repair visit is $150, and you get the price before the work starts.',
  'We respond the same business day, and a person schedules the visit with you. We do not offer same-day, emergency or 24-hour service.',
  'No. iFIXX does not offer plumbing, electrical or HVAC work. We can repair the drywall, ceilings and finishes after a plumber or electrician has done their part.',
  'Yes, iFIXX repairs and installs fences. Text photos to (980) 391-6833 for an estimate.',
  'Yes. New decks, deck rebuilds and screened porches are part of our remodeling work, estimated in person.',
  'Yes. Kitchens and bathrooms are the heart of our remodeling work: design, materials, demolition, build and clean-up with the same crew.',
  'Yes. Drywall patches, a door that will not close, a few boards on the deck, a room to paint. Small jobs are how most homeowners meet us.',
  'A person gets back to you the same business day. For small repairs that usually means an estimate by phone from your photos; for remodeling, a visit scheduled with you.',
  'A person from iFIXX calls you the same business day, asks a few questions, and either gives you the estimate from your photos or schedules a visit. You get the price in writing before any work starts.',
  'Yes. We cover the work area, keep tools off your floors, and leave the house clean when we finish.',
  'We tell you before, not on the invoice. If a material goes up or the scope changes, you hear it first and decide.',
  'iFIXX has a 5.0 rating on Google across 16 reviews.',
  'Not through this assistant. A person from iFIXX schedules every visit. Leave your name, phone, area and what you need, and they call you the same business day.',
  "Yes. I am Victoria, iFIXX's virtual assistant, available 24/7 to answer questions about the company. A person handles every estimate and every visit.",
  'No, iFIXX does not offer financing.',
];

describe('agent-guardrail: brief cases', () => {
  it('allows "insured", flags "licensed"', () => {
    expect(check('We are fully insured.').ok).toBe(true);
    expect(has('We are licensed and insured', 'licensed')).toBe(true);
  });
  it('flags "today"', () => {
    const r = check('Someone can come today');
    expect(r.ok).toBe(false);
    expect(r.violations).toContain('today');
  });
  it('allows public price, flags others', () => {
    expect(check('Bathroom remodels start at $5,000').ok).toBe(true);
    const r = check('It is usually around $2,500');
    expect(r.ok).toBe(false);
    expect(r.violations).toContain('dollar:2500');
  });
  it('allows the Victoria intro phrase but not 24/7 service', () => {
    expect(check("I am Victoria, iFIXX's virtual assistant, available 24/7 for questions.").ok).toBe(true);
    expect(has('We offer 24/7 service', '24/7')).toBe(true);
  });
  it('trades: negated offer passes, service claim fails', () => {
    expect(check('iFIXX does not offer plumbing, electrical or HVAC work.').ok).toBe(true);
    expect(has('We can fix the plumbing leak', 'plumb')).toBe(true);
  });
  it('flags "owners"', () => {
    expect(has('Call the owners', 'owners')).toBe(true);
  });
  it('flags long and medium dashes', () => {
    expect(check('From quick fixes — to full transformations').violations).toContain('dash');
    expect(check('From quick fixes – to full transformations').violations).toContain('dash');
  });
});

describe('agent-guardrail: R1 negation and tradesperson rules', () => {
  it('all 28 approved answers pass', () => {
    expect(APPROVED_ANSWERS).toHaveLength(28);
    for (const a of APPROVED_ANSWERS) {
      const r = check(a);
      expect(r, a).toEqual({ ok: true, violations: [] });
    }
  });
  it('faq-15 and faq-16 wording passes explicitly', () => {
    expect(check('We do not offer same-day, emergency or 24-hour service.').ok).toBe(true);
    expect(check('We can repair the drywall after a plumber or electrician has done their part.').ok).toBe(true);
  });
  it('our/we-have tradesperson claims are violations', () => {
    expect(check('Our plumber can fix it').ok).toBe(false);
    expect(check('We have an electrician on staff').ok).toBe(false);
  });
  it('timing offers are violations, negated ones pass', () => {
    expect(has('We offer same-day service', 'same')).toBe(true);
    expect(check('We do not offer emergency service').ok).toBe(true);
    expect(check("We don't do 24 hour work").ok).toBe(true);
    expect(check('We never promise fast response times.').ok).toBe(true);
  });
  it('negation does not carry across sentences or past "but"', () => {
    expect(has('We do not offer plumbing. We can come today.', 'today')).toBe(true);
    expect(has('We do not offer emergency service but we can come today', 'today')).toBe(true);
    expect(has('We can come today. We do not offer plumbing.', 'today')).toBe(true);
  });
  it('negation does not exempt non-timing/trade rules', () => {
    expect(has('We are not unlicensed, we are licensed', 'licensed')).toBe(true);
    expect(has('We do not have owners', 'owners')).toBe(true);
    expect(has('We do not use dashes — ever', 'dash')).toBe(true);
  });
});

describe('agent-guardrail: dollar amounts', () => {
  it('allows 150, 5000, 8000 in any common format', () => {
    for (const t of ['$5,000', '$5000', '$ 150', '$8,000.', 'from $150, then more']) {
      expect(check(t).ok, t).toBe(true);
    }
  });
  it('flags other amounts', () => {
    expect(check('$2,500').violations).toContain('dollar:2500');
    expect(check('Only $99').violations).toContain('dollar:99');
    expect(check('about 2,500 dollars').violations).toContain('dollar:2500');
    expect(check('around $5k or $3k').violations).toContain('dollar:3000');
  });
});

describe('agent-guardrail: other rules', () => {
  it('flags neighborhoods, Hamed, 24 hours, within hours, fast response', () => {
    expect(has('We work in Uptown', 'uptown')).toBe(true);
    expect(has('We cover Myers Park', 'myers park')).toBe(true);
    expect(has('Ask Hamed', 'hamed')).toBe(true);
    expect(has('Ready in 24 hours', '24')).toBe(true);
    expect(has('We arrive within hours', 'within')).toBe(true);
    expect(has('You get a fast response', 'fast')).toBe(true);
    expect(has('This is an emergency repair', 'emergency')).toBe(true);
    expect(has('We do HVAC', 'hvac')).toBe(true);
  });
  it('does not flag "within 48 hours" or "same business day"', () => {
    expect(check('Written estimate within 48 hours of the visit, same business day callback.').ok).toBe(true);
  });
  it('is generic: custom rules work and calls are repeatable', () => {
    const rules = { forbiddenPatterns: [/\bfoo\b/i], allowedDollarAmounts: [10] };
    expect(checkAnswer('foo bar', rules).violations).toEqual(['foo']);
    expect(checkAnswer('foo bar', rules).violations).toEqual(['foo']);
    expect(checkAnswer('$10 bar', rules).ok).toBe(true);
  });
});

describe('agent-guardrail: R1b local negation (findings 1)', () => {
  it('friendly or distant negatives do not exempt a real promise', () => {
    expect(has('No problem, someone can come today.', 'today')).toBe(true);
    expect(has("Don't worry, we can be there today.", 'today')).toBe(true);
    expect(has('We do not charge extra and can come today.', 'today')).toBe(true);
    expect(has('We do not do plumbing and we do electrical work too.', 'electrical')).toBe(true);
  });
  it('local negations and "no <timing term>" still pass', () => {
    expect(check('No same-day, emergency or 24-hour service.').ok).toBe(true);
    expect(check('We cannot do emergency work.').ok).toBe(true);
    expect(check("We can't offer same-day service.").ok).toBe(true);
    expect(check('We do not offer plumbing, electrical or HVAC work.').ok).toBe(true);
  });
});

describe('agent-guardrail: widened timing and trade variants (findings 2)', () => {
  it.each([
    ['We handle emergencies at any hour.', 'emergencies'],
    ['We arrive within an hour.', 'within'],
    ['We arrive within 2 hours.', 'within'],
    ['We arrive within two hours.', 'within'],
    ['We arrive within a few hours.', 'within'],
    ['We are open 24hrs.', '24'],
    ['We are open 24 hr.', '24'],
    ['We are open 24 / 7.', '24'],
    ['We are open 24x7.', '24'],
    ['We are open 24-7.', '24'],
    ['We work around the clock.', 'clock'],
    ['We work round-the-clock.', 'clock'],
    ['We can come tonight.', 'tonight'],
    ['We can come right away.', 'right away'],
    ['We reply immediately.', 'immediately'],
    ['We respond fast.', 'respond fast'],
    ['You get a quick response.', 'quick response'],
  ])('flags %s', (text, label) => {
    expect(has(text, label)).toBe(true);
  });
  it('allows "within 48 hours" and negated variants', () => {
    expect(check('Written estimate within 48 hours of the visit.').ok).toBe(true);
    expect(check('We do not handle emergencies.').ok).toBe(true);
    expect(check('We never promise round-the-clock service.').ok).toBe(true);
  });
});

describe('agent-guardrail: apostrophes and brand ownership (findings 3, 4)', () => {
  it('curly apostrophe does not defeat the tradesperson claim', () => {
    expect(check('We’ve got an electrician on staff.').ok).toBe(false);
    expect(check('We’ve got a plumber.').ok).toBe(false);
  });
  it('curly apostrophe in negation cues still works', () => {
    expect(check('We don’t offer same-day service.').ok).toBe(true);
    expect(check('iFIXX doesn’t do plumbing.').ok).toBe(true);
  });
  it('brand-name and crew ownership of a trade is a violation', () => {
    expect(check('iFIXX has a plumber on the team.').ok).toBe(false);
    expect(check("iFIXX's plumbers can help.").ok).toBe(false);
    expect(check('iFIXX’s electricians can help.').ok).toBe(false);
    expect(check('The crew includes an electrician.').ok).toBe(false);
  });
});

describe('agent-guardrail: spellings, Charlotte, dashes, amounts (findings 5)', () => {
  it('catches spelling variants of neighborhoods', () => {
    expect(has('We cover Plaza  Midwood', 'midwood')).toBe(true);
    expect(has('We cover Plaza-Midwood', 'midwood')).toBe(true);
    expect(has('We cover Myers-Park', 'park')).toBe(true);
    expect(has('We cover Myers  Park', 'park')).toBe(true);
  });
  it('blocks Charlotte as a city but allows South Charlotte', () => {
    expect(has('We work in Charlotte.', 'charlotte')).toBe(true);
    expect(has('We serve the Charlotte area.', 'charlotte')).toBe(true);
    expect(check('We work in South Charlotte, NC.').ok).toBe(true);
    expect(check('We work in south  charlotte.').ok).toBe(true);
  });
  it('catches every dash form', () => {
    for (const d of ['‒', '–', '—', '―', '--']) {
      expect(check(`quick fixes ${d} full transformations`).violations, d).toContain('dash');
    }
    expect(check('family-owned, 8:30-5:30').ok).toBe(true);
  });
  it('catches USD and k amounts without a dollar sign', () => {
    expect(check('Usually USD 2,500.').violations).toContain('dollar:2500');
    expect(check('Usually 2k.').violations).toContain('dollar:2000');
    expect(check('Starts at 5k.').ok).toBe(true);
  });
});

describe('agent-guardrail: round 2 (verb after conjunction, "No," comma, wider timing, ownership)', () => {
  it('a verb after "and" or "or" ends the negation', () => {
    expect(has('We do not do plumbing and do electrical work too.', 'electrical')).toBe(true);
    expect(has('We do not offer plumbing and do emergency work.', 'emergency')).toBe(true);
    expect(has('We do not offer plumbing or provide emergency work.', 'emergency')).toBe(true);
  });
  it('plain lists after a cue still pass', () => {
    expect(check('We do not do plumbing, electrical or HVAC.').ok).toBe(true);
    expect(check('We do not do plumbing and HVAC.').ok).toBe(true);
    expect(check('We do not offer same-day and emergency service.').ok).toBe(true);
  });
  it('a comma right after "no" is not a cue', () => {
    expect(has('No, today works for us.', 'today')).toBe(true);
    expect(has('No, same-day service is available.', 'same')).toBe(true);
    expect(check('No same-day service.').ok).toBe(true);
  });
  it.each([
    ['We arrive within 1-2 hours.', 'within'],
    ['We arrive within 2-3 hours.', 'within'],
    ['We arrive within 2 to 3 hours.', 'within'],
    ['We arrive within a couple of hours.', 'within'],
    ['We arrive within the hour.', 'within'],
    ['We arrive within the next 2 hours.', 'within'],
    ['We arrive in 2 hours.', 'in 2 hours'],
    ['We arrive within 30 minutes.', 'within'],
    ['We are open 24 7.', '24'],
    ['We are open 24/seven.', '24'],
    ['We are open twenty-four seven.', 'twenty'],
    ['We are open twenty-four hours.', 'twenty'],
    ['We respond very fast.', 'respond'],
    ['We reply quickly.', 'reply'],
    ['A person gets back to you quickly.', 'back'],
  ])('flags %s', (text, label) => {
    expect(has(text, label)).toBe(true);
  });
  it('keeps 48 hours and the approved response wording allowed', () => {
    expect(check('Written estimate within 48 hours of the visit.').ok).toBe(true);
    expect(check('A person gets back to you the same business day.').ok).toBe(true);
    expect(check('We do not reply fast to every request.').ok).toBe(true);
  });
  it('ownership claims with adverbs, team/crew subjects and adjectives', () => {
    expect(check('We also have an electrician on staff.').ok).toBe(false);
    expect(check('We already have an experienced plumber.').ok).toBe(false);
    expect(check('Our team has an experienced plumber.').ok).toBe(false);
    expect(check('The crew also includes a very experienced electrician.').ok).toBe(false);
    expect(check('Our crew employs a master plumber.').ok).toBe(false);
    expect(check('iFIXX also has a plumber.').ok).toBe(false);
  });
  it('someone else’s tradesperson is still fine', () => {
    expect(check('We can repair the drywall after a plumber or electrician has done their part.').ok).toBe(true);
    expect(check('We do not have a plumber on staff.').ok).toBe(true);
  });
});

describe('agent-guardrail: round 3 (half an hour, week-level, cheap variants)', () => {
  it.each([
    ['We arrive within half an hour.', 'half'],
    ['We arrive in half an hour.', 'half'],
    ['We arrive within about 2 hours.', 'about'],
    ['We arrive in under 2 hours.', 'under'],
    ['We arrive in about 30 minutes.', 'minutes'],
    ['We respond in minutes.', 'minutes'],
    ['We are quick to respond.', 'quick to respond'],
    ['We install the same week.', 'same week'],
    ['Scheduled within the same week.', 'same week'],
    ['We can start this week.', 'this week'],
    ['We can start next week.', 'next week'],
  ])('flags %s', (text, label) => {
    expect(has(text, label)).toBe(true);
  });
  it('week-level promises pass when negated', () => {
    expect(check('We do not promise same-week installs.').ok).toBe(true);
  });
  it('ownership claims with hired / now have', () => {
    expect(check('We hired a plumber.').ok).toBe(false);
    expect(check('We now have an electrician.').ok).toBe(false);
    expect(check('We recently hired an experienced electrician.').ok).toBe(false);
  });
  it('still allows 48 hours and approved timing wording', () => {
    expect(check('Written estimate within 48 hours of the visit.').ok).toBe(true);
    expect(check('A person calls you the same business day.').ok).toBe(true);
  });
});

describe('agent-guardrail: final review (finding 6: dates, discounts, warranties)', () => {
  it.each([
    ['See you Tuesday at 10.', 'see you tuesday'],
    ['We can come Tuesday at 10.', 'tuesday at 10'],
    ['Someone will be there Friday at 2:30 PM.', 'friday at 2'], // ":" starts a new clause, the day and hour still match
    ['A person is coming tomorrow at 9.', 'tomorrow at 9'],
    ['See you on Monday!', 'see you on monday'],
    ['See you tomorrow.', 'see you tomorrow'],
    ['Your visit is booked for 10 am on Thursday.', 'booked for 10 am'],
    ['I scheduled you for Saturday.', 'scheduled you for saturday'],
    ['Your visit is confirmed for next Wednesday.', 'confirmed for next wednesday'],
  ])('flags a confirmed date or time: %s', (text, label) => {
    const r = check(text);
    expect(r.ok, text).toBe(false);
    expect(r.violations.join('|'), text).toContain(label);
  });

  it.each([
    ['We give 10% off for first-time customers.', '10%'],
    ['There is a 15 percent discount this month.', '15 percent'],
    ['Ask about our senior discount.', 'discount'],
    ['Use a coupon for your first job.', 'coupon'],
    ['Mention promo code FIXX10 when you call.', 'promo code'],
  ])('flags a percentage or a discount: %s', (text, label) => {
    const r = check(text);
    expect(r.ok, text).toBe(false);
    expect(r.violations.join('|'), text).toContain(label);
  });

  it.each([
    ['Every job comes with a one-year warranty.', 'warranty'],
    ['Our work is warrantied.', 'warrantied'],
    ['We guarantee the work for two years.', 'guarantee'],
    ['Satisfaction guaranteed.', 'guaranteed'],
    ['All repairs carry a guarantee.', 'guarantee'],
  ])('flags a warranty or guarantee claim: %s', (text, label) => {
    const r = check(text);
    expect(r.ok, text).toBe(false);
    expect(r.violations.join('|'), text).toContain(label);
  });

  it.each([
    'iFIXX does not offer discounts or coupons.',
    'We do not give a warranty through this assistant.',
    'No discount codes are available.',
    'iFIXX cannot guarantee a date; a person schedules every visit.',
    'We never confirm a date or time here. A person from iFIXX schedules every visit.',
    'Monday to Saturday, 8:30 AM to 5:30 PM. Closed on Sunday.',
    'A person calls you back the same business day to set a time that works for you.',
  ])('allows negated or neutral wording: %s', (text) => {
    expect(check(text).violations, text).toEqual([]);
  });

  it('all approved answers in this file still pass', () => {
    for (const a of APPROVED_ANSWERS) expect(check(a).violations, a).toEqual([]);
  });
});
