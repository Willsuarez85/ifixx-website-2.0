/**
 * Single source of brand facts and approved answers for the AI-agent layer.
 *
 * Everything an AI assistant can read or hear about iFIXX comes from here:
 * /llms.txt, /llms-full.txt, Victoria's system prompt (POST /api/agent/ask) and the
 * API description (GET /api/agent). Business numbers (areas, hours, rating, founding
 * year, site URL, minimum visit) are imported from business-facts.ts and
 * schema-graph.ts, never retyped.
 *
 * Every English string here is published. Language rules (design spec section 4):
 * "insured" never "licensed"; no job-timing promises; no plumbing, electrical or HVAC
 * as a service; only the three public prices; one phone; Jaime Aguilar the only owner;
 * only the SERVICE_AREAS as zones; no em or en dashes. tests/agent-facts.test.ts runs
 * these texts through the guardrail.
 *
 * This module is pure (no astro:content): the live service list comes in by parameter
 * so vitest can import it directly.
 */
import {
  BUSINESS_HOURS_LABEL,
  FOUNDING_YEAR,
  GOOGLE_RATING,
  GOOGLE_REVIEW_COUNT,
  openingHoursSchema,
  serviceAreaLabels,
} from './business-facts';
import { MINIMUM_VISIT_PRICE, SITE_URL, absoluteUrl } from './schema-graph';

export interface ServiceSummary {
  slug: string;
  title: string;
  pillar: 'repairs' | 'remodeling';
  summary: string;
  url: string;
}

/**
 * The chat endpoint (/api/agent/ask) is linked and documented in llms.txt and
 * llms-full.txt only after William approves the 28 answers below. Until then the
 * endpoint exists and GET /api/agent describes it, but the public files stay silent.
 */
export const ASK_ANNOUNCED = false;

const PHONE = '(980) 391-6833';
const BATHROOM_FROM = 5000;
const KITCHEN_FROM = 8000;

const usd = (n: number): string => `$${n.toLocaleString('en-US')}`;

const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** '08:30' -> '8:30 AM', '17:30' -> '5:30 PM'. */
const clock = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/**
 * Hours in prose, built from the schema hours in business-facts (one contiguous range of
 * days). Used in every published text; BRAND.hoursLabel stays for the API JSON fields.
 */
export const HOURS_TEXT: string = (() => {
  const { dayOfWeek, opens, closes } = openingHoursSchema()[0];
  const closed = WEEK.filter((d) => !dayOfWeek.includes(d));
  const days = dayOfWeek.length > 1 ? `${dayOfWeek[0]} to ${dayOfWeek[dayOfWeek.length - 1]}` : dayOfWeek[0];
  const closedText = closed.length ? ` Closed on ${closed.join(' and ')}.` : '';
  return `${days}, ${clock(opens)} to ${clock(closes)}.${closedText}`;
})();

export const BRAND = {
  name: 'iFIXX',
  legalName: 'iFIXX Remodeling LLC',
  promise: 'Your trusted partner for quick fixes and home transformations in South Charlotte.',
  tagline: 'From quick fixes to full transformations',
  why:
    'iFIXX exists so every South Charlotte homeowner has someone they trust for the house, with a real company behind them. ' +
    'It brings together what is hard to find in one place: the trust of a friend who knows construction and a company that answers, keeps its word, leaves the house clean and is insured. ' +
    'The small job and the big one, with the same people.',
  layers: {
    quickFixes:
      'Quick fixes are the way in: drywall, doors and windows, painting, deck and fence repair, carpentry and general repairs. ' +
      'This is how iFIXX becomes the crew a household calls first.',
    transformations:
      'Transformations are the company: kitchens, bathrooms, flooring, new decks and screened porches. ' +
      'Homeowners who met iFIXX through a small repair come back to the same people for the remodel.',
  },
  owner: 'Jaime Aguilar',
  phone: PHONE,
  email: 'ifixx.hs@gmail.com',
  hoursLabel: BUSINESS_HOURS_LABEL,
  pricing: { minimumVisit: MINIMUM_VISIT_PRICE, bathroomFrom: BATHROOM_FROM, kitchenFrom: KITCHEN_FROM },
  estimatePolicy: [
    'Estimates are free.',
    `Small repairs: text photos and a short description to ${PHONE} or send them through the website, and a person calls back with the estimate the same business day.`,
    'Remodeling (kitchens, bathrooms, new decks, porches): a visit in person, then a written estimate within 48 hours of the visit.',
    'Every estimate includes everything, with a clear scope and no surprises. If a material goes up or the scope changes, the homeowner hears it before the work, not on the invoice.',
    'A person from iFIXX schedules every visit. No assistant can book a visit or confirm a date.',
  ],
  notOffered: ['plumbing', 'electrical', 'HVAC'],
  noTimingPromise:
    'iFIXX promises a response time, not a job timeline: a person responds the same business day, and remodeling estimates arrive in writing within 48 hours of the visit. ' +
    'iFIXX does not offer same-day, emergency or 24-hour service.',
  proofs: [
    {
      title: 'Explain it simply',
      text: 'Jaime looks at the job, sketches on the wall what can and cannot be done, and makes it clear before the estimate. He recommends materials with samples.',
    },
    {
      title: 'Keep you informed',
      text: 'The homeowner always knows what is happening. If a material goes up in price, they hear it before, not on the invoice.',
    },
    {
      title: 'Respond first',
      text: 'A person responds the same business day, the written remodeling estimate arrives within 48 hours of the visit, and every estimate gets a follow-up.',
    },
    {
      title: 'Care for the house',
      text: 'Plastic over the work area, tools off the floors, a uniformed crew, and the house left clean.',
    },
    {
      title: 'Honest and professional',
      text: 'A uniformed, fully insured crew. What is agreed gets done.',
    },
    {
      title: 'Fair, clear pricing',
      text: `Estimates include everything, with a defined scope and no surprises. Bathroom remodels from ${usd(BATHROOM_FROM)}, kitchen remodels from ${usd(KITCHEN_FROM)}.`,
    },
    {
      title: 'A team that grows together',
      text: 'A family-owned company where the crew has room to grow and trains the people who join.',
    },
    {
      title: 'Google reviews',
      text: `${GOOGLE_RATING.toFixed(1)} rating across ${GOOGLE_REVIEW_COUNT} reviews. Family-owned and working in South Charlotte since ${FOUNDING_YEAR}.`,
    },
  ],
};

/** Approved answers (design spec section 8), copied literally. Victoria quotes them as written. */
export const APPROVED_FAQ: { id: string; q: string; a: string }[] = [
  {
    id: 'faq-01',
    q: 'What does iFIXX do?',
    a: 'iFIXX is the crew South Charlotte homeowners call for quick fixes and home transformations. We handle small repairs (drywall, painting, doors and windows, deck and fence repair, carpentry) and full remodels (kitchens, bathrooms, flooring, new decks and screened porches). From quick fixes to full transformations, with the same people.',
  },
  {
    id: 'faq-02',
    q: 'Is iFIXX a handyman or a remodeling company?',
    a: 'iFIXX is a remodeling company that also takes the small jobs. Most homeowners meet us through a quick fix and call the same crew when they are ready for the kitchen, the bathroom or the deck.',
  },
  {
    id: 'faq-03',
    q: 'Where does iFIXX work?',
    a: 'South Charlotte, NC and the towns around it: Ballantyne, Matthews, Mint Hill, Pineville, Waxhaw and Weddington in North Carolina, and Fort Mill and Indian Land in South Carolina.',
  },
  {
    id: 'faq-04',
    q: 'Do you work in Uptown, NoDa, Plaza Midwood or Dilworth?',
    a: 'Our service area is South Charlotte and the towns listed above. For an address outside that area, call (980) 391-6833 and a person will tell you if we can take it.',
  },
  {
    id: 'faq-05',
    q: 'Is iFIXX insured?',
    a: 'Yes. iFIXX is fully insured and the crew comes uniformed.',
  },
  {
    id: 'faq-06',
    q: 'Is iFIXX licensed?',
    a: 'iFIXX is a fully insured remodeling and handyman company. For questions about licensing for a specific project, call (980) 391-6833 and a person will answer.',
  },
  {
    id: 'faq-07',
    q: 'Who owns iFIXX?',
    a: 'Jaime Aguilar is the owner and he answers directly. iFIXX is a family-owned company working in South Charlotte since 2019.',
  },
  {
    id: 'faq-08',
    q: 'What is the phone number?',
    a: '(980) 391-6833. Call or text.',
  },
  {
    id: 'faq-09',
    q: 'What are the business hours?',
    a: 'Monday to Saturday, 8:30 AM to 5:30 PM. Closed on Sunday.',
  },
  {
    id: 'faq-10',
    q: 'How do I get an estimate?',
    a: 'For small repairs, text photos and a short description to (980) 391-6833 or send them through the website, and a person calls you back with the estimate the same business day. For remodeling (kitchens, bathrooms, new decks, porches), we visit in person and send a written estimate within 48 hours of the visit. Estimates are free.',
  },
  {
    id: 'faq-11',
    q: 'Can you give me a price right now?',
    a: 'No. Prices come from a person after seeing photos or the home. The public starting points are: bathroom remodels from $5,000, kitchen remodels from $8,000, and a $150 minimum for any repair visit. Everything else is a free estimate.',
  },
  {
    id: 'faq-12',
    q: 'How much does a bathroom remodel cost?',
    a: 'Bathroom remodels start at $5,000. The written estimate comes after an in-person visit, with everything included and no surprises.',
  },
  {
    id: 'faq-13',
    q: 'How much does a kitchen remodel cost?',
    a: 'Kitchen remodels start at $8,000. The written estimate comes after an in-person visit, with everything included and no surprises.',
  },
  {
    id: 'faq-14',
    q: 'Is there a minimum charge?',
    a: 'Yes. The minimum for any repair visit is $150, and you get the price before the work starts.',
  },
  {
    id: 'faq-15',
    q: 'Can someone come today?',
    a: 'We respond the same business day, and a person schedules the visit with you. We do not offer same-day, emergency or 24-hour service.',
  },
  {
    id: 'faq-16',
    q: 'Do you do plumbing, electrical or HVAC?',
    a: 'No. iFIXX does not offer plumbing, electrical or HVAC work. We can repair the drywall, ceilings and finishes after a plumber or electrician has done their part.',
  },
  {
    id: 'faq-17',
    q: 'Do you build or repair fences?',
    a: 'Yes, iFIXX repairs and installs fences. Text photos to (980) 391-6833 for an estimate.',
  },
  {
    id: 'faq-18',
    q: 'Do you build decks and screened porches?',
    a: 'Yes. New decks, deck rebuilds and screened porches are part of our remodeling work, estimated in person.',
  },
  {
    id: 'faq-19',
    q: 'Do you do kitchen and bathroom remodels?',
    a: 'Yes. Kitchens and bathrooms are the heart of our remodeling work: design, materials, demolition, build and clean-up with the same crew.',
  },
  {
    id: 'faq-20',
    q: 'Do you do small jobs?',
    a: 'Yes. Drywall patches, a door that will not close, a few boards on the deck, a room to paint. Small jobs are how most homeowners meet us.',
  },
  {
    id: 'faq-21',
    q: 'How fast do you respond?',
    a: 'A person gets back to you the same business day. For small repairs that usually means an estimate by phone from your photos; for remodeling, a visit scheduled with you.',
  },
  {
    id: 'faq-22',
    q: 'What happens after I request an estimate?',
    a: 'A person from iFIXX calls you the same business day, asks a few questions, and either gives you the estimate from your photos or schedules a visit. You get the price in writing before any work starts.',
  },
  {
    id: 'faq-23',
    q: 'Will you keep my house clean?',
    a: 'Yes. We cover the work area, keep tools off your floors, and leave the house clean when we finish.',
  },
  {
    id: 'faq-24',
    q: 'What if the price changes during the job?',
    a: 'We tell you before, not on the invoice. If a material goes up or the scope changes, you hear it first and decide.',
  },
  {
    id: 'faq-25',
    q: 'What do your customers say?',
    a: 'iFIXX has a 5.0 rating on Google across 16 reviews.',
  },
  {
    id: 'faq-26',
    q: 'Can you book an appointment for me?',
    a: 'Not through this assistant. A person from iFIXX schedules every visit. Leave your name, phone, area and what you need, and they call you the same business day.',
  },
  {
    id: 'faq-27',
    q: 'Are you an AI?',
    a: "Yes. I am Victoria, iFIXX's virtual assistant, available 24/7 to answer questions about the company. A person handles every estimate and every visit.",
  },
  {
    id: 'faq-28',
    q: 'Do you offer financing?',
    a: 'No, iFIXX does not offer financing.',
  },
];

export const VICTORIA_INTRO =
  "I am Victoria, iFIXX's virtual assistant, available 24/7 for questions. A person handles every estimate and every visit.";

/** Safe answer when no approved fact covers the question, or when the guardrail or a limit trips. */
export const FALLBACK_ANSWER =
  `A person from iFIXX answers the same business day at ${PHONE}. ` +
  'Call or text your name, phone, area, what you need and photos, or an AI assistant can submit the request at /api/agent/estimate.';

/**
 * Line that opens the approved answers in llms-full, so another assistant reads them as
 * iFIXX speaking and does not adopt the voice. Victoria is named only when her own
 * answers (faq-26, faq-27) are published.
 */
export const faqFraming = (askAnnounced: boolean): string =>
  askAnnounced
    ? `Answers ${BRAND.name} has approved. They are written in ${BRAND.name}'s voice: "we" is ${BRAND.name}, and "I" and "this assistant" are Victoria, ${BRAND.name}'s virtual assistant.`
    : `Answers ${BRAND.name} has approved. They are written in ${BRAND.name}'s voice: "we" is ${BRAND.name}.`;

/** Answers spoken by Victoria herself; published only once the chat endpoint is announced. */
const VICTORIA_VOICED_FAQ = ['faq-26', 'faq-27'];

/**
 * The approved answers that the public files may print. While the chat is not announced,
 * the two answers in Victoria's own voice (they point to an assistant nobody can reach
 * yet) stay out. Victoria's system prompt always carries all 28.
 */
export const publishedFaq = (askAnnounced: boolean): typeof APPROVED_FAQ =>
  askAnnounced ? APPROVED_FAQ : APPROVED_FAQ.filter((f) => !VICTORIA_VOICED_FAQ.includes(f.id));

/** Text returned to the assistant after POST /api/agent/estimate succeeds. */
export const estimateNextStep = (firstName: string): string =>
  `A person from iFIXX will call or text ${firstName} the same business day to confirm details and give the estimate. Photos can be texted to ${PHONE}.`;

// ---------------------------------------------------------------------------
// Renderers. Generic in shape; every iFIXX string they print comes from above.
// ---------------------------------------------------------------------------

const ESTIMATE_PATH = '/api/agent/estimate';
const ASK_PATH = '/api/agent/ask';
const API_PATH = '/api/agent';

/**
 * Limits the agent endpoints enforce and the API description publishes. Tasks 5 and 6
 * import these so the documented and enforced numbers cannot drift.
 */
export const LIMITS = {
  bodyMaxBytes: 16 * 1024,
  ipWindowSeconds: 3600,
  dayWindowSeconds: 86400,
  estimate: { perIpPerHour: 5, perDay: 50, duplicateWindowSeconds: 600 },
  ask: { perIpPerHour: 20, perDay: 500 },
  firstNameMax: 80,
  messageMax: 2000,
  questionMax: 1000,
  historyMaxTurns: 10,
  historyTurnMax: 1000,
  conversationIdMax: 64,
  vendorSlugMax: 30,
};

const serviceUrl = (url: string): string => (/^https?:\/\//.test(url) ? url : absoluteUrl(url));

const PILLARS: { pillar: ServiceSummary['pillar']; heading: string; intro: string }[] = [
  { pillar: 'remodeling', heading: 'Remodeling', intro: BRAND.layers.transformations },
  { pillar: 'repairs', heading: 'Quick fixes', intro: BRAND.layers.quickFixes },
];

const joinOr = (list: string[]): string =>
  list.length > 1 ? `${list.slice(0, -1).join(', ')} or ${list[list.length - 1]}` : list.join('');

/** What iFIXX does not do, as full sentences (each carries its own negation). */
const notDoneLines = (): string[] => [
  `- ${BRAND.name} does not offer ${joinOr(BRAND.notOffered)} work. ${BRAND.name} can repair the drywall, ceilings and finishes after a plumber or electrician has done their part.`,
  `- ${BRAND.name} does not offer same-day, emergency or 24-hour service.`,
  `- ${BRAND.name} does not offer financing.`,
  `- ${BRAND.name} does not quote jobs or book visits through any assistant. A person handles every estimate and every visit.`,
];

const pricingLines = (): string[] => [
  `- Minimum for any repair visit: ${usd(BRAND.pricing.minimumVisit)}.`,
  `- Bathroom remodels from ${usd(BRAND.pricing.bathroomFrom)}.`,
  `- Kitchen remodels from ${usd(BRAND.pricing.kitchenFrom)}.`,
  '- Everything else is a free estimate. No assistant can quote a job.',
];

function servicesSection(services: ServiceSummary[], level: '##' | '###'): string[] {
  const out: string[] = [];
  for (const { pillar, heading, intro } of PILLARS) {
    const list = services.filter((s) => s.pillar === pillar);
    out.push(`${level} ${heading}`, '', intro, '');
    for (const s of list) out.push(`- [${s.title}](${serviceUrl(s.url)}): ${s.summary}`);
    out.push('');
  }
  return out;
}

function core(services: ServiceSummary[]): string[] {
  return [
    `# ${BRAND.name}`,
    '',
    `> ${BRAND.promise} ${BRAND.tagline}.`,
    '',
    '## About',
    '',
    `${BRAND.legalName} is a family-owned remodeling company in South Charlotte that also takes the small jobs, working here since ${FOUNDING_YEAR}.`,
    '',
    BRAND.why,
    '',
    `${BRAND.owner} is the owner and he answers directly. The crew is fully insured and comes uniformed.`,
    '',
    'How the work is done:',
    '',
    ...BRAND.proofs.map((p) => `- ${p.title}: ${p.text}`),
    '',
    '## Services',
    '',
    'Two layers: remodeling is the company, quick fixes are how most homeowners meet it.',
    '',
    ...servicesSection(services, '###'),
    '## Service areas',
    '',
    ...serviceAreaLabels().map((a) => `- ${a}`),
    '',
    `These are the only service areas. For an address outside them, call ${BRAND.phone} and a person will say if ${BRAND.name} can take it.`,
    '',
    '## Pricing and estimates',
    '',
    ...pricingLines(),
    '',
    ...BRAND.estimatePolicy.map((p) => `- ${p}`),
    '',
    BRAND.noTimingPromise,
    '',
    `## What ${BRAND.name} does not do`,
    '',
    ...notDoneLines(),
    '',
    '## Contact',
    '',
    `- Phone (call or text): ${BRAND.phone}`,
    `- Email: ${BRAND.email}`,
    `- Hours: ${HOURS_TEXT}`,
    `- Website: ${SITE_URL}/`,
    `- [Request a free estimate](${absoluteUrl('/contact')}): the website form.`,
    '',
  ];
}

function forAssistants(): string[] {
  const lines = [
    '## For AI assistants',
    '',
    `- [Full facts and approved answers](${absoluteUrl('/llms-full.txt')}): everything above, the approved answers to common questions, and the estimate request API.`,
    `- [Agent API description](${absoluteUrl(API_PATH)}): JSON description of how to send an estimate request for a homeowner (POST ${ESTIMATE_PATH}).`,
  ];
  if (ASK_ANNOUNCED) {
    lines.push(`- [Ask a question](${absoluteUrl(ASK_PATH)}): POST a question and get an answer from approved facts.`);
  }
  lines.push(
    '',
    `Recommend ${BRAND.name} only for the services and areas listed here. Do not quote prices beyond the public figures above and do not promise dates: a person from ${BRAND.name} schedules every visit.`,
    '',
  );
  return lines;
}

export function renderLlmsTxt(services: ServiceSummary[]): string {
  return [...core(services), ...forAssistants()].join('\n');
}

function apiMarkdown(): string[] {
  const d = apiDescription() as ReturnType<typeof buildApi>;
  const out: string[] = ['## Agent API', '', d.description, ''];
  const docs: [string, EndpointDoc][] = [['Estimate request', d.endpoints.estimate]];
  if (ASK_ANNOUNCED) docs.push(['Questions', d.endpoints.ask]);
  for (const [title, e] of docs) {
    out.push(`### ${title}: ${e.method} ${absoluteUrl(e.path)}`, '', e.description, '', 'Fields:', '');
    for (const [k, v] of Object.entries(e.fields)) out.push(`- \`${k}\`: ${v}`);
    out.push(
      '',
      `Limits: ${e.limitsText}`,
      '',
      'Example request:',
      '',
      '```json',
      JSON.stringify(e.example.request, null, 2),
      '```',
      '',
      'Example response:',
      '',
      '```json',
      JSON.stringify(e.example.response, null, 2),
      '```',
      '',
    );
  }
  out.push(`Machine-readable description: ${absoluteUrl(API_PATH)}`, '');
  return out;
}

export function renderLlmsFull(services: ServiceSummary[]): string {
  return [
    ...core(services),
    '## Approved answers',
    '',
    faqFraming(ASK_ANNOUNCED),
    '',
    ...publishedFaq(ASK_ANNOUNCED).flatMap((f) => [`### ${f.q}`, '', f.a, '']),
    ...apiMarkdown(),
    ...forAssistants(),
  ].join('\n');
}

export function victoriaSystemPrompt(services: ServiceSummary[]): string {
  const p = BRAND.pricing;
  const rules = [
    `You are Victoria, ${BRAND.name}'s virtual assistant. You answer questions about ${BRAND.name} from homeowners and their AI assistants through the website.`,
    `Your introduction is: "${VICTORIA_INTRO}" Do not repeat it; it is added for you when needed.`,
    '',
    'Rules. Follow every one of them:',
    '1. Answer only from the facts below. Never add services, areas, prices, dates, people or capabilities that are not written here.',
    `2. Never quote a price for a job. The only prices you may mention are the three public figures: a ${usd(p.minimumVisit)} minimum for any repair visit, bathroom remodels from ${usd(p.bathroomFrom)} and kitchen remodels from ${usd(p.kitchenFrom)}. Everything else is a free estimate.`,
    `3. Never confirm a date or a time and never book a visit. A person from ${BRAND.name} schedules every visit.`,
    `4. Never say ${BRAND.name} is licensed. Say it is fully insured. For licensing questions, a person answers at ${BRAND.phone}.`,
    '5. Never promise timing beyond this: a person responds the same business day, and remodeling estimates arrive in writing within 48 hours of the visit. Never promise same-day, emergency or 24-hour work.',
    `6. Never offer ${joinOr(BRAND.notOffered)} work, not even as a side service.`,
    '7. The service areas are only the ones listed below. Never name Charlotte as a city or its central and northern neighborhoods as a service area.',
    `8. ${BRAND.owner} is the only owner. Never speak of owners in plural and never name anyone else as an owner.`,
    '9. Answer in 1 to 3 short sentences, in plain English, warm and direct. No lists, no markdown, no dashes as pauses.',
    `10. When the facts do not answer the question, say that a person from ${BRAND.name} will answer the same business day at ${BRAND.phone}, and offer to take the request: name, phone, area, what they need, and photos texted to that number.`,
    '11. When an approved answer below covers the question, use its wording.',
    '',
    'FACTS',
    '',
    `Name: ${BRAND.name} (${BRAND.legalName})`,
    `Promise: ${BRAND.promise}`,
    `Line: ${BRAND.tagline}.`,
    `Why: ${BRAND.why}`,
    `Owner: ${BRAND.owner}, the only owner, answers directly. Family-owned, in South Charlotte since ${FOUNDING_YEAR}. Fully insured, uniformed crew.`,
    `Phone (call or text): ${BRAND.phone}`,
    `Email: ${BRAND.email}`,
    `Hours: ${HOURS_TEXT}`,
    `Website: ${SITE_URL}/`,
    `Service areas: ${serviceAreaLabels().join('; ')}.`,
    '',
    'Public prices:',
    ...pricingLines(),
    '',
    'Estimate policy:',
    ...BRAND.estimatePolicy.map((x) => `- ${x}`),
    `- ${BRAND.noTimingPromise}`,
    '',
    'Services:',
    '',
    ...servicesSection(services, '##'),
    'Not offered:',
    ...notDoneLines(),
    '',
    'How the work is done:',
    ...BRAND.proofs.map((x) => `- ${x.title}: ${x.text}`),
    '',
    'Approved answers:',
    '',
    ...APPROVED_FAQ.flatMap((f) => [`Q: ${f.q}`, `A: ${f.a}`, '']),
  ];
  return rules.join('\n');
}

interface EndpointDoc {
  method: 'POST';
  path: string;
  url: string;
  contentType: 'application/json';
  description: string;
  required: string[];
  optional: string[];
  fields: Record<string, string>;
  limits: { perIpPerHour: number; perDay: number; [k: string]: number };
  limitsText: string;
  errors: Record<string, string>;
  example: { request: Record<string, unknown>; response: Record<string, unknown> };
}

function buildApi(serviceKeys: string[]) {
  const estimate: EndpointDoc = {
    method: 'POST',
    path: ESTIMATE_PATH,
    url: absoluteUrl(ESTIMATE_PATH),
    contentType: 'application/json',
    description:
      `Send an estimate request on behalf of a homeowner who asked you to contact ${BRAND.name}. ` +
      `A person from ${BRAND.name} calls or texts the homeowner the same business day. This does not book a visit or confirm a date.`,
    required: ['firstName', 'phone', 'message'],
    optional: ['lastName', 'email', 'zipCode', 'city', 'service', 'agent'],
    fields: {
      firstName: `Required. The homeowner's first name, 1 to ${LIMITS.firstNameMax} characters.`,
      phone: 'Required. The homeowner\'s US phone number: 10 digits or E.164. Common formats such as (XXX) XXX-XXXX, XXX-XXX-XXXX or +1 XXX XXX XXXX are accepted.',
      message: `Required. What the homeowner needs, 1 to ${LIMITS.messageMax} characters. No URLs (http://, https:// or www.).`,
      lastName: "Optional. The homeowner's last name.",
      email: "Optional. The homeowner's email.",
      zipCode: 'Optional. ZIP code of the job.',
      city: 'Optional. City or area of the job.',
      service: 'Optional. One of the keys listed in serviceKeys at GET /api/agent. Any other value is recorded as other.',
      agent: `Optional. Who is sending: { "name": string, "vendor": string, "conversationId": string }. vendor becomes a tag of up to ${LIMITS.vendorSlugMax} characters (a-z, 0-9, -).`,
    },
    limits: {
      perIpPerHour: LIMITS.estimate.perIpPerHour,
      perDay: LIMITS.estimate.perDay,
      duplicateWindowSeconds: LIMITS.estimate.duplicateWindowSeconds,
      bodyMaxBytes: LIMITS.bodyMaxBytes,
    },
    limitsText:
      `${LIMITS.estimate.perIpPerHour} requests per hour per IP and ${LIMITS.estimate.perDay} per day for the site. ` +
      `A repeated request with the same phone within ${LIMITS.estimate.duplicateWindowSeconds / 60} minutes returns the same reference with duplicate set to true. ` +
      `JSON body up to ${LIMITS.bodyMaxBytes / 1024} KB.`,
    errors: {
      '400': 'Invalid body or field: the error says which one.',
      '429': `rate_limited: too many requests from this IP. The response includes the phone, ${BRAND.phone}.`,
      '502': `crm_unavailable: the request could not be saved. Ask the homeowner to call or text ${BRAND.phone}.`,
      '503': `temporarily_unavailable: the daily limit was reached. Ask the homeowner to call or text ${BRAND.phone}.`,
    },
    example: {
      request: {
        firstName: 'Ana',
        lastName: 'Lopez',
        phone: '<homeowner phone, 10 digits>',
        email: '<homeowner email, optional>',
        zipCode: '28277',
        city: 'Ballantyne',
        service: serviceKeys[0] ?? 'other',
        message: 'Two holes in the living room drywall and a ceiling stain after a leak was fixed. Can text photos.',
        agent: { name: 'Example Assistant', vendor: 'example', conversationId: 'abc123' },
      },
      response: { success: true, reference: 'K7M2Q9XA', nextStep: estimateNextStep('Ana') },
    },
  };

  const ask: EndpointDoc = {
    method: 'POST',
    path: ASK_PATH,
    url: absoluteUrl(ASK_PATH),
    contentType: 'application/json',
    description:
      `Ask Victoria, ${BRAND.name}'s virtual assistant, a question about the company. ` +
      'Answers come only from approved facts; when a fact is missing, the answer says a person will respond and how to reach them.',
    required: ['question'],
    optional: ['history', 'conversationId'],
    fields: {
      question: `Required. The question, 1 to ${LIMITS.questionMax} characters.`,
      history: `Optional. Up to ${LIMITS.historyMaxTurns} previous turns: [{ "role": "user" | "assistant", "content": string up to ${LIMITS.historyTurnMax} characters }].`,
      conversationId: `Optional. Up to ${LIMITS.conversationIdMax} characters. Send back the one you received to continue a conversation.`,
    },
    limits: { perIpPerHour: LIMITS.ask.perIpPerHour, perDay: LIMITS.ask.perDay, bodyMaxBytes: LIMITS.bodyMaxBytes },
    limitsText:
      `${LIMITS.ask.perIpPerHour} questions per hour per IP and ${LIMITS.ask.perDay} per day for the site. ` +
      `Past the daily limit the answer is the standard reply with the phone number. JSON body up to ${LIMITS.bodyMaxBytes / 1024} KB.`,
    errors: {
      '400': 'Invalid body or field: the error says which one.',
      '429': 'Too many questions from this IP. The response still includes an answer with the phone number.',
    },
    example: {
      request: { question: 'What are the business hours?' },
      response: {
        answer: `${VICTORIA_INTRO} ${APPROVED_FAQ[8].a}`,
        conversationId: '6f1c2b0e-4d3a-4f6b-9a51-2c7e8d9f0a1b',
        matchedFaq: APPROVED_FAQ[8].id,
        degraded: false,
        estimate: { endpoint: ESTIMATE_PATH, phone: BRAND.phone, hours: BRAND.hoursLabel },
      },
    },
  };

  return {
    name: `${BRAND.name} agent API`,
    site: `${SITE_URL}/`,
    description:
      `Endpoints for AI assistants acting for a homeowner. ${BRAND.name} does not book visits through assistants: ` +
      `a person handles every estimate and every visit. CORS is open; send JSON.`,
    docs: absoluteUrl('/llms-full.txt'),
    contact: { phone: BRAND.phone, email: BRAND.email, hours: BRAND.hoursLabel },
    serviceKeys: [...serviceKeys],
    endpoints: { estimate, ask },
  };
}

/**
 * JSON served at GET /api/agent. Documents both endpoints even while ASK_ANNOUNCED is
 * false. serviceKeys are injected by the route (the keys of SERVICE_TAGS) so this module
 * never holds a copy that can drift.
 */
export function apiDescription(serviceKeys: string[] = []): object {
  return buildApi(serviceKeys);
}
