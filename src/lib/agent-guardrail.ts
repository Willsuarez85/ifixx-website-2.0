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

function isNegated(prefix: string, rules: GuardrailRules, terms: RegExp[]): boolean {
  const cue = rules.negationCue;
  if (!cue) return false;
  const glue = rules.negationGlue;
  const tokens = prefix.split(/\s+/).filter(Boolean);
  for (let i = tokens.length - 1; i >= 0 && i >= tokens.length - CUE_WINDOW; i--) {
    const tok = cleanToken(tokens[i]);
    if (cue.test(tok)) return true;
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
            if (!isNegated(clause.slice(0, m.index ?? 0), rules, terms)) add(label(m[0]));
          }
        }
      }
    }
  }

  for (const v of dollarViolations(body, rules.allowedDollarAmounts)) add(v);

  return { ok: violations.length === 0, violations };
}

// Spec section 4 (language restrictions) encoded as rules.
export const DEFAULT_RULES: GuardrailRules = {
  forbiddenPatterns: [
    /licensed/i,
    /24\s*[/x-]\s*7\b/i,
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
    /24[- ]?\s?(?:hours?|hrs?)\b/i,
    /(?:around|round)[- ]the[- ]clock/i,
    /emergenc(?:y|ies)/i,
    /within\s+(?:an?\s+(?:few\s+)?hours?\b|half\s+an?\s+hour\b|hours?\b|(?:[1-9]|1\d|2[0-3])\s*(?:hours?|hrs?)\b|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+hours?\b)/i,
    /\bright away\b/i,
    /\bimmediately\b/i,
    /\b(?:fast|quick|rapid|speedy)[- ]response\b/i,
    /\brespond(?:s|ing)?\s+(?:fast|quickly)\b/i,
    // trades as a service (plumber / electrician as someone else's trade are allowed)
    /\bplumb(?!ers?\b)\w*/i,
    /\belectric(?!ians?\b)\w*/i,
    /\bhvac\b/i,
    // trades people claimed as ours: "our plumber", "we have an electrician",
    // "iFIXX has a plumber", "iFIXX's plumbers", "the crew includes an electrician"
    /(?:\bour\b|\bwe(?:'ve|\s+(?:have|has|employ|use|send|bring|got))\b|\bifixx(?:'s\b|\s+(?:has|have|employs|uses|sends|brings)\b)|\bcrew(?:'s\b|\s+(?:has|includes)\b))\s+(?:[\w'-]+\s+){0,3}?(?:plumbers?|electricians?)\b/i,
  ],
  negationCue: /^(?:not|never|no|cannot|can't|don't|doesn't|won't|isn't|aren't|without)$/,
  negationGlue:
    /^(?:or|and|nor|offer|offers|provide|provides|any|service|services|work|do|does|doing|to|a|an|the|of|promise|guarantee|have|make|accept|handle|take|include)$/,
  exemptPhrases: [/virtual assistant, available 24\/7/i],
  allowedDollarAmounts: [150, 5000, 8000],
};
