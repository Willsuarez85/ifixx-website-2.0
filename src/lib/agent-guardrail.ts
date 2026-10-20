// Deterministic answer guardrail. Every model-generated answer (and every approved
// FAQ answer) passes through checkAnswer before it can reach a visitor.
// The engine is generic; the only site-specific strings live in DEFAULT_RULES,
// which encodes the language restrictions of the design spec (section 4).

export interface GuardrailRules {
  /** Always forbidden, in any sentence. */
  forbiddenPatterns: RegExp[];
  /** Dollar figures that may appear in public answers. */
  allowedDollarAmounts: number[];
  /** Forbidden unless the same clause has an earlier negation cue ("we do not offer ..."). */
  negatablePatterns?: RegExp[];
  /** Words that negate a claim; only applies to negatablePatterns. */
  negationCue?: RegExp;
  /** Exact phrases removed before evaluation (e.g. the assistant's self-introduction). */
  exemptPhrases?: RegExp[];
}

export interface GuardrailResult {
  ok: boolean;
  violations: string[];
}

const DASH_CHARS = /^[—–]$/;
// A clause ends at ; : or a contrast word, so a negation does not leak past "but".
const CLAUSE_BREAK = /[;:]|\b(?:but|however|although|though|except|yet)\b/gi;
const SENTENCE_SPLIT = /(?<=[.!?])\s+|\n+/;

function global(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
}

function label(match: string): string {
  const m = match.trim().replace(/\s+/g, ' ').toLowerCase();
  return DASH_CHARS.test(m) ? 'dash' : m;
}

function negatedBefore(sentence: string, index: number, cue: RegExp): boolean {
  let start = 0;
  for (const b of sentence.slice(0, index).matchAll(CLAUSE_BREAK)) start = (b.index ?? 0) + b[0].length;
  return cue.test(sentence.slice(start, index));
}

function dollarViolations(text: string, allowed: number[]): string[] {
  const out: string[] = [];
  const seen = new Set<number>();
  const flag = (value: number) => {
    if (!Number.isFinite(value) || allowed.includes(value) || seen.has(value)) return;
    seen.add(value);
    out.push(`dollar:${value}`);
  };
  for (const m of text.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)\s?(k\b)?/gi)) {
    flag(parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1));
  }
  for (const m of text.matchAll(/\b(\d[\d,]*(?:\.\d+)?)\s?(?:dollars|bucks|usd)\b/gi)) {
    flag(parseFloat(m[1].replace(/,/g, '')));
  }
  return out;
}

export function checkAnswer(text: string, rules: GuardrailRules): GuardrailResult {
  let body = text;
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
    const cue = rules.negationCue ?? /(?!)/;
    for (const sentence of body.split(SENTENCE_SPLIT)) {
      for (const re of negatable) {
        for (const m of sentence.matchAll(global(re))) {
          if (!negatedBefore(sentence, m.index ?? 0, cue)) add(label(m[0]));
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
    /24\/7/i,
    /\bowners\b/i,
    /\bhamed\b/i,
    /dilworth|\bnoda\b|plaza midwood|myers park|uptown/i,
    /[—–]/,
  ],
  negatablePatterns: [
    // timing promises
    /same[- ]day/i,
    /\btoday\b/i,
    /24[- ]hours?/i,
    /emergency/i,
    /within\s+(?:a\s+few\s+)?hours/i,
    /fast[- ]response/i,
    // trades as a service (plumber / electrician as someone else's trade are allowed)
    /\bplumb(?!ers?\b)\w*/i,
    /\belectric(?!ians?\b)\w*/i,
    /\bhvac\b/i,
    // trades people claimed as ours
    /(?:\bour\b|\bwe(?:'ve|\s+(?:have|employ|use|send|bring|got))\b)\s+(?:[\w-]+\s+){0,3}?(?:plumbers?|electricians?)\b/i,
  ],
  negationCue: /\b(?:not\s+offer|do\s+not|don't|does\s+not|doesn't|never|no)\b/i,
  exemptPhrases: [/virtual assistant, available 24\/7/i],
  allowedDollarAmounts: [150, 5000, 8000],
};
