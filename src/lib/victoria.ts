/**
 * Victoria, the virtual assistant behind POST /api/agent/ask. Generic engine: every
 * site-specific string (approved answers, introduction, fallback, system prompt) comes
 * from agent-facts.ts.
 *
 * Answer path, safest first (design spec section 5.3 and 5.6):
 * 1. Exact match with an approved question (normalized): that answer, verbatim.
 * 2. The model classifies the question among the approved ids; the text still comes
 *    from the file, never from the model, without its leading "Yes." or "No.".
 * 3. When the classifier says "none", no model wording is exposed. The caller gets
 *    the human fallback.
 * 4. Any doubt or failure (no key, API error or timeout): the
 *    fallback answer that sends the visitor to a person.
 */
import {
  APPROVED_FAQ,
  BRAND,
  FALLBACK_ANSWER,
  VICTORIA_INTRO,
  type ServiceSummary,
} from './agent-facts';

export interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

export const VICTORIA_MODEL = 'claude-haiku-5-5' as const;

export interface LlmEnv {
  apiKey?: string;
  model: typeof VICTORIA_MODEL;
}

export interface AnswerOptions {
  /** Total time answer() may spend on the model, in ms. Default keeps the call under 10 s. */
  budgetMs?: number;
}

export interface VictoriaAnswer {
  answer: string;
  matchedFaq?: string;
  flagged: boolean;
  violations: string[];
  degraded: boolean;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
}

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const CALL_TIMEOUT_MS = 8000;
const DEFAULT_BUDGET_MS = 9000;
const CLASSIFY_MAX_TOKENS = 10;
const MIN_CLASSIFY_MS = 500;
const INTRO_MARKER = 'I am Victoria';

/**
 * The introduction goes before an answer on the first turn only (ruling R5), unless the
 * answer already introduces Victoria. It is pre-approved, so it is added after the guardrail.
 */
export function withIntro(text: string, firstTurn: boolean): string {
  return firstTurn && !text.includes(INTRO_MARKER) ? `${VICTORIA_INTRO} ${text}` : text;
}

/** Lowercase, no punctuation, single spaces. Apostrophes vanish ("what's" -> "whats"). */
export function normalizeQuestion(q: string): string {
  return q
    .normalize('NFKC')
    .toLowerCase()
    .replace(/['‘’ʼ`]/g, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const BY_QUESTION = new Map(APPROVED_FAQ.map((f) => [normalizeQuestion(f.q), f]));
const BY_ID = new Map(APPROVED_FAQ.map((f) => [f.id, f]));

/** The approved answer whose question equals q once both are normalized, or null. */
export function exactMatch(q: string): { id: string; a: string } | null {
  const f = BY_QUESTION.get(normalizeQuestion(q));
  return f ? { id: f.id, a: f.a } : null;
}

/**
 * An approved answer reached through the classifier, without its leading "Yes." or "No.".
 * The classifier can match a question that asks the opposite ("Is iFIXX uninsured?" to
 * "Is iFIXX insured?"), where a bare "Yes." would say the wrong thing. Every approved body
 * stands on its own without it. An exact match keeps the wording verbatim.
 */
export function withoutPolarity(text: string): string {
  return text.replace(/^(?:Yes|No)[.,!]\s+/, '');
}

interface ModelCall {
  system: string;
  messages: Turn[];
  maxTokens: number;
  timeoutMs: number;
}

interface ModelResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  stopReason?: string;
}

/**
 * One Messages API call. Throws on a missing key, an HTTP status >= 400, a malformed
 * body or the timeout. The timeout holds even if fetchImpl ignores the abort signal.
 */
async function callModel(env: LlmEnv, call: ModelCall, fetchImpl: typeof fetch): Promise<ModelResult> {
  if (!env.apiKey) throw new Error('missing API key');
  const timeoutMs = Math.max(0, Math.min(CALL_TIMEOUT_MS, call.timeoutMs));
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`model call timed out after ${timeoutMs} ms`));
    }, timeoutMs);
  });

  const work = (async () => {
    const res = await fetchImpl(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': env.apiKey!,
        'anthropic-version': API_VERSION,
        'content-type': 'application/json',
      },
      // No temperature: this model rejects it (400 "temperature is deprecated"). Thinking
      // off keeps the reply short and every output token on the answer itself.
      body: JSON.stringify({
        model: env.model,
        max_tokens: call.maxTokens,
        thinking: { type: 'disabled' },
        system: call.system,
        messages: call.messages,
      }),
      signal: controller.signal,
    });
    if (res.status >= 400) throw new Error(`model API answered ${res.status}`);
    const data: any = await res.json();
    const block = Array.isArray(data?.content) ? data.content.find((b: any) => b?.type === 'text') : undefined;
    if (typeof block?.text !== 'string') throw new Error('model API answer has no text');
    return {
      text: block.text,
      tokensIn: Number(data?.usage?.input_tokens) || 0,
      tokensOut: Number(data?.usage?.output_tokens) || 0,
      stopReason: typeof data?.stop_reason === 'string' ? data.stop_reason : undefined,
    };
  })();
  work.catch(() => {}); // a late failure after the timeout must not surface as unhandled

  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

const classifySystem = (): string =>
  [
    `You route questions sent to ${BRAND.name}'s virtual assistant.`,
    'Below are the approved questions, each with its id. If the question you receive asks the same thing as one of them, reply with that id only, for example faq-03.',
    'If none of them answers it, or one covers only part of it (for example the question also names a town or asks a second thing), or you are not sure, reply with none.',
    'If the question asks the opposite of an approved question, or a yes/no answer would read differently, reply none.',
    'Reply with the id or none and nothing else.',
    '',
    ...APPROVED_FAQ.map((f) => `${f.id}: ${f.q}`),
  ].join('\n');

/**
 * The approved id when the reply is exactly one id (an optional final period allowed),
 * else null. "none", an unknown id, two ids or any hedging all count as none.
 */
function parseFaqId(text: string): string | null {
  const m = /^\s*(faq-\d{2}|none)\s*\.?\s*$/i.exec(text);
  const id = m?.[1].toLowerCase();
  return id && BY_ID.has(id) ? id : null;
}

async function classifyCall(q: string, env: LlmEnv, fetchImpl: typeof fetch, timeoutMs: number) {
  const r = await callModel(
    env,
    { system: classifySystem(), messages: [{ role: 'user', content: q }], maxTokens: CLASSIFY_MAX_TOKENS, timeoutMs },
    fetchImpl
  );
  return { id: parseFaqId(r.text), tokensIn: r.tokensIn, tokensOut: r.tokensOut };
}

/**
 * Picks the approved question that q asks, by id, or null when none does. Throws when
 * the call fails, so a failure is never mistaken for "none".
 */
export async function classify(q: string, env: LlmEnv, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  return (await classifyCall(q, env, fetchImpl, CALL_TIMEOUT_MS)).id;
}

/** Victoria's answer to q. Never throws. */
export async function answer(
  q: string,
  history: Turn[],
  _services: ServiceSummary[],
  env: LlmEnv,
  fetchImpl: typeof fetch = fetch,
  options: AnswerOptions = {}
): Promise<VictoriaAnswer> {
  const firstTurn = history.length === 0;
  const intro = (text: string) => withIntro(text, firstTurn);
  const deadline = Date.now() + (options.budgetMs ?? DEFAULT_BUDGET_MS);
  const remaining = () => deadline - Date.now();

  let tokensIn = 0;
  let tokensOut = 0;
  let usedModel = false;
  const usage = () => (usedModel ? { model: env.model, tokensIn, tokensOut } : {});
  const fallback = (degraded: boolean, violations: string[] = []): VictoriaAnswer => ({
    answer: intro(FALLBACK_ANSWER),
    flagged: violations.length > 0,
    violations,
    degraded,
    ...usage(),
  });

  try {
    const exact = exactMatch(q);
    if (exact) return { answer: intro(exact.a), matchedFaq: exact.id, flagged: false, violations: [], degraded: false };
    if (!env.apiKey) return fallback(true);
    if (remaining() < MIN_CLASSIFY_MS) {
      console.warn('victoria: not enough time left to classify');
      return fallback(true);
    }

    let classified: string | null;
    try {
      usedModel = true;
      const c = await classifyCall(q, env, fetchImpl, remaining());
      classified = c.id;
      tokensIn += c.tokensIn;
      tokensOut += c.tokensOut;
    } catch {
      console.warn('victoria: classification failed');
      return fallback(true);
    }

    if (classified) {
      const f = BY_ID.get(classified)!;
      return { answer: intro(withoutPolarity(f.a)), matchedFaq: f.id, flagged: false, violations: [], degraded: false, ...usage() };
    }

    return fallback(false);
  } catch {
    console.warn('victoria: unexpected error');
    return fallback(true);
  }
}
