// Deterministic answer guardrail. Every model-generated answer (and every approved
// FAQ answer) passes through checkAnswer before it can reach a visitor.
// The engine is generic; the only site-specific strings live in DEFAULT_RULES,
// which encodes the language restrictions of the design spec (section 4).

export interface GuardrailRules {
  /** Always forbidden, in any sentence. */
  forbiddenPatterns: RegExp[];
  /** Dollar figures that may appear in public answers. */
  allowedDollarAmounts: number[];
  /**
   * Forbidden unless a negation cue sits right before the match, within a few words,
   * with only list glue (or other negatable terms) in between, in the same clause.
   */
  negatablePatterns?: RegExp[];
  /** Matches one lowercased token that negates ("not", "never", "can't"...). */
  negationCue?: RegExp;
  /** Matches one lowercased token that may sit between a cue and a match ("or", "offer"...). */
  negationGlue?: RegExp;
  /**
   * Matches a token that, right after a conjunction (and / or / nor), starts a new
   * predicate and ends the negation ("do not do plumbing and DO electrical work").
   */
  negationReset?: RegExp;
  /** Exact phrases removed before evaluation (e.g. the assistant's self-introduction). */
  exemptPhrases?: RegExp[];
}

export interface GuardrailResult {
  ok: boolean;
  violations: string[];
}

const DASH_LABEL = /^(?:[‒-―]|--)$/;
const SENTENCE_SPLIT = /(?<=[.!?])\s+|\n+/;
// A new clause starts at ; : contrast words, and before a new subject that follows a
// comma, "and", "while" or "so". The subject itself stays in the new clause.
const SUBJECT = '(?:we|i|someone|a person|ifixx|they|you|our|it|he|she)\\b';
const CLAUSE_SPLIT = new RegExp(
  `[;:]|\\b(?:but|however|although|though|except|yet)\\b|,\\s*(?=${SUBJECT})|\\b(?:and|while|so)\\s+(?=${SUBJECT})`,
  'i'
);
// How many words before a match a negation cue may sit.
const CUE_WINDOW = 7;

function global(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
}

function plain(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags.replace('g', '').replace('y', ''));
}

function label(match: string): string {
  const m = match.trim().replace(/\s+/g, ' ').toLowerCase();
  return DASH_LABEL.test(m) ? 'dash' : m;
}

function cleanToken(t: string): string {
  return t.toLowerCase().replace(/^[^\w']+|[^\w']+$/g, '');
}

const CONJUNCTION = /^(?:and|or|nor)$/;

function isNegated(prefix: string, matchText: string, rules: GuardrailRules, terms: RegExp[]): boolean {
  const cue = rules.negationCue;
  if (!cue) return false;
  const glue = rules.negationGlue;
  const tokens = prefix.split(/\s+/).filter(Boolean);
  for (let i = tokens.length - 1; i >= 0 && i >= tokens.length - CUE_WINDOW; i--) {
    const tok = cleanToken(tokens[i]);
    if (cue.test(tok)) {
      // "No, today works": punctuation right after the cue ends it.
      return !/[,;:]$/.test(tokens[i]);
    }
    if (CONJUNCTION.test(tok) && rules.negationReset) {
      const next = cleanToken(i + 1 < tokens.length ? tokens[i + 1] : matchText.split(/\s+/)[0] ?? '');
      if (rules.negationReset.test(next)) return false;
    }
    if (tok === '' || glue?.test(tok) || terms.some((t) => t.test(tok))) continue;
    return false;
  }
  return false;
}

function dollarViolations(text: string, allowed: number[]): string[] {
  const out: string[] = [];
  const seen = new Set<number>();
  const flag = (value: number) => {
    if (!Number.isFinite(value) || allowed.includes(value) || seen.has(value)) return;
    seen.add(value);
    out.push(`dollar:${value}`);
  };
  const num = (s: string) => parseFloat(s.replace(/,/g, ''));
  for (const m of text.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)\s?(k\b)?/gi)) flag(num(m[1]) * (m[2] ? 1000 : 1));
  for (const m of text.matchAll(/\b(\d[\d,]*(?:\.\d+)?)\s?(?:dollars|bucks|usd)\b/gi)) flag(num(m[1]));
  for (const m of text.matchAll(/\busd\s?(\d[\d,]*(?:\.\d+)?)/gi)) flag(num(m[1]));
  for (const m of text.matchAll(/\b(\d+(?:\.\d+)?)k\b/gi)) flag(num(m[1]) * 1000);
  return out;
}

export function checkAnswer(text: string, rules: GuardrailRules): GuardrailResult {
  // Curly apostrophes and quotes would defeat "we've", "don't" and brand's forms.
  let body = text.replace(/[‘’ʼ]/g, "'");
  for (const phrase of rules.exemptPhrases ?? []) body = body.replace(global(phrase), ' ');

  const violations: string[] = [];
  const add = (v: string) => {
    if (!violations.includes(v)) violations.push(v);
  };

  for (const re of rules.forbiddenPatterns) {
    for (const m of body.matchAll(global(re))) add(label(m[0]));
  }

  const negatable = rules.negatablePatterns ?? [];
  if (negatable.length) {
    const terms = negatable.map(plain);
    for (const sentence of body.split(SENTENCE_SPLIT)) {
      for (const clause of sentence.split(CLAUSE_SPLIT)) {
        for (const re of negatable) {
          for (const m of clause.matchAll(global(re))) {
            if (!isNegated(clause.slice(0, m.index ?? 0), m[0], rules, terms)) add(label(m[0]));
          }
        }
      }
    }
  }

  for (const v of dollarViolations(body, rules.allowedDollarAmounts)) add(v);

  return { ok: violations.length === 0, violations };
}

const NUM_WORDS = 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve';
const VAGUE = 'an?|a\\s+couple(?:\\s+of)?|a\\s+few|few|several';
const RANGE_TAIL = '(?:\\s*(?:-|to|or)\\s*\\d+)?';
const LEAD =
  '\\b(?:within|in)\\s+(?:the\\s+next\\s+)?(?:(?:about|around|under|roughly|approximately|less\\s+than|just|only)\\s+)?';
// 1 to 24 hours; larger numbers do not match thanks to the \\b after the number
const HOURS_WINDOW = new RegExp(
  `(?:\\bwithin\\s+the\\s+(?:next\\s+)?hour\\b|${LEAD}half\\s+an?\\s+hour\\b|${LEAD}(?:${VAGUE}|(?:[1-9]|1\\d|2[0-4]|${NUM_WORDS})\\b${RANGE_TAIL})\\s*(?:hours?|hrs?)\\b)`,
  'i'
);
const MINUTES_WINDOW = new RegExp(`${LEAD}(?:${VAGUE}|(?:\\d+|${NUM_WORDS})${RANGE_TAIL})\\s*(?:minutes?|mins?)\\b`, 'i');

// A confirmed date or time: "Tuesday at 10", "tomorrow at 9 am", "see you on Monday",
// "booked for 10 am", "scheduled you for Saturday". A person schedules every visit.
const DAY = '(?:mon|tues|wednes|thurs|fri|satur|sun)day';
const CLOCK = '\\d{1,2}(?::\\d{2})?\\s?[ap]\\.?m\\b\\.?';
const DAY_AT_TIME = new RegExp(`\\b(?:${DAY}|tomorrow|tonight)\\s+at\\s+\\d{1,2}(?::\\d{2})?(?:\\s?[ap]\\.?m\\b\\.?)?`, 'i');
const SEE_YOU = new RegExp(`\\bsee\\s+you\\s+(?:on\\s+|this\\s+|next\\s+)?(?:${DAY}|tomorrow|tonight)\\b`, 'i');
const BOOKED_FOR = new RegExp(
  `\\b(?:booked|scheduled|confirmed|reserved|set)\\s+(?:(?:you|it|that|(?:the|your)\\s+(?:visit|appointment))\\s+)?(?:for|on)\\s+(?:(?:this|next|the)\\s+)?(?:${DAY}|tomorrow|tonight|${CLOCK})`,
  'i'
);

// Spec section 4 (language restrictions) encoded as rules.
export const DEFAULT_RULES: GuardrailRules = {
  forbiddenPatterns: [
    /licensed/i,
    // 24/7, 24x7, 24-7, 24 7, 24/seven, twenty-four seven
    /\b(?:24(?:\s*[/x-]\s*|\s+)|twenty[- ]four[- ])(?:7|seven)\b/i,
    /\bowners\b/i,
    /\bhamed\b/i,
    /dilworth|\bnoda\b|plaza[\s-]+midwood|myers[\s-]+park|uptown/i,
    // Charlotte as a city; "South Charlotte" is the approved area name
    /(?<!south[\s-]+)\bcharlotte\b/i,
    // long and medium dashes (U+2012 to U+2015) and the double hyphen
    /[‒-―]|--/,
  ],
  negatablePatterns: [
    // timing promises
    /same[- ]day/i,
    /\btoday\b/i,
    /\btonight\b/i,
    /\b(?:24|twenty[- ]four)[- ]?\s?(?:hours?|hrs?)\b/i,
    /(?:around|round)[- ]the[- ]clock/i,
    /emergenc(?:y|ies)/i,
    // short windows: within/in an hour, 2 hours, 1-2 hours, 2 to 3 hours, a couple of hours,
    // the hour, the next 2 hours, 30 minutes. Hours from 25 up (e.g. "within 48 hours") stay allowed.
    HOURS_WINDOW,
    MINUTES_WINDOW,
    /\bwithin\s+(?:hours?|minutes?)\b/i,
    /\bin\s+(?:just\s+)?(?:minutes|seconds)\b/i,
    /\b(?:quick|fast|prompt|speedy)\s+to\s+(?:respond|reply|answer)\b/i,
    // week-level promises
    /same[- ]week/i,
    /\b(?:this|next)\s+week\b/i,
    /\bright away\b/i,
    /\bimmediately\b/i,
    /\b(?:fast|quick|rapid|speedy)[- ]response\b/i,
    /\b(?:respond|reply|answer|gets?\s+back)(?:s|ed|ing)?(?:\s+to\s+you)?\s+(?:(?:very|super|really)\s+)?(?:fast|quickly|promptly|right\s+away)\b/i,
    // a confirmed date or time
    DAY_AT_TIME,
    SEE_YOU,
    BOOKED_FOR,
    // percentages and discounts (the only public figures are the three prices)
    /\b\d+(?:\.\d+)?\s?(?:%|percent\b)/i,
    /\bdiscount(?:s|ed)?\b/i,
    /\bcoupons?\b/i,
    /\bpromo(?:tional)?\s+codes?\b/i,
    // warranty and guarantee claims
    /\bwarrant(?:y|ies|ied)\b/i,
    /\bguarantee[sd]?\b/i,
    /\bguaranty\b/i,
    // trades as a service (plumber / electrician as someone else's trade are allowed)
    /\bplumb(?!ers?\b)\w*/i,
    /\belectric(?!ians?\b)\w*/i,
    /\bhvac\b/i,
    // trades people claimed as ours: "our plumber", "we have an electrician",
    // "iFIXX has a plumber", "iFIXX's plumbers", "the crew includes an electrician"
    /(?:\bour\b|\bwe've\b|\bifixx's\b|\b(?:crew|team)'s\b|\b(?:we|ifixx|(?:the\s+|our\s+)?(?:team|crew))\s+(?:(?:also|already|even|currently|always|both|now|just|recently)\s+)*(?:has|have|had|hired|hires?|employs?|uses?|sends?|brings?|includes?|got|keeps?)\b)\s+(?:[\w'-]+\s+){0,4}?(?:plumbers?|electricians?)\b/i,
  ],
  negationCue: /^(?:not|never|no|cannot|can't|don't|doesn't|won't|isn't|aren't|without)$/,
  negationGlue:
    /^(?:or|and|nor|offer|offers|provide|provides|any|service|services|work|do|does|doing|to|a|an|the|of|promise|guarantee|have|make|accept|handle|take|include|give|gives)$/,
  negationReset:
    /^(?:do|does|doing|offer|offers|provide|provides|work|works|handle|handles|take|takes|include|includes|make|makes|have|has|accept|accepts|promise|guarantee|give|gives)$/,
  exemptPhrases: [/virtual assistant, available 24\/7/i],
  allowedDollarAmounts: [150, 5000, 8000],
};
