import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { AGENT_SITE_ID_DEFAULT, BRAND, FALLBACK_ANSWER, LIMITS, VICTORIA_INTRO, type ServiceSummary } from '../../../lib/agent-facts';
import { agentEnv, clientIp, ipHash, jsonResponse, optionsResponse, readJson } from '../../../lib/agent-http';
import { bump, saveConversation, type StoreEnv } from '../../../lib/agent-store';
import { liveServices } from '../../../lib/services-live';
import { answer, VICTORIA_MODEL, type Turn } from '../../../lib/victoria';

/**
 * POST /api/agent/ask: an AI assistant asks Victoria a question about the business.
 * Approved answers first, then the model under the guardrail, and the fallback to a
 * person on any doubt or failure. Generic: every site-specific string comes from
 * agent-facts.
 */
export const prerender = false;

const CONVERSATION_ID = /^[A-Za-z0-9._:-]+$/;
const USER_AGENT_MAX = 300;
/** The whole request stays under 10 s: the model gets what is left of this after the counters. */
const REQUEST_BUDGET_MS = 9500;
/** Longest wait for the conversation log before answering anyway. */
const SAVE_WAIT_MS = 1500;

interface AskRequest {
  question: string;
  history: Turn[];
  conversationId: string;
}

type Validated = { ok: true; value: AskRequest } | { ok: false; error: string };

const bad = (error: string) => jsonResponse(400, { error });

function validate(data: unknown): Validated {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'Body must be a JSON object with a question.' };
  }
  const d = data as Record<string, unknown>;

  const question = typeof d.question === 'string' ? d.question.trim() : '';
  if (!question || question.length > LIMITS.questionMax) {
    return { ok: false, error: `question is required, 1 to ${LIMITS.questionMax} characters.` };
  }

  const historyError =
    `history must be an array of up to ${LIMITS.historyMaxTurns} turns, ` +
    `each { "role": "user" | "assistant", "content": 1 to ${LIMITS.historyTurnMax} characters }.`;
  const history: Turn[] = [];
  if (d.history !== undefined && d.history !== null) {
    if (!Array.isArray(d.history) || d.history.length > LIMITS.historyMaxTurns) return { ok: false, error: historyError };
    for (const t of d.history) {
      if (!t || typeof t !== 'object' || Array.isArray(t)) return { ok: false, error: historyError };
      const { role, content } = t as Record<string, unknown>;
      if (role !== 'user' && role !== 'assistant') return { ok: false, error: historyError };
      if (typeof content !== 'string' || !content.trim() || content.length > LIMITS.historyTurnMax) {
        return { ok: false, error: historyError };
      }
      history.push({ role, content });
    }
  }

  let conversationId: string;
  if (d.conversationId === undefined || d.conversationId === null || d.conversationId === '') {
    conversationId = randomUUID();
  } else {
    const id = typeof d.conversationId === 'string' ? d.conversationId.trim() : '';
    if (!id || id.length > LIMITS.conversationIdMax || !CONVERSATION_ID.test(id)) {
      return {
        ok: false,
        error: `conversationId must be up to ${LIMITS.conversationIdMax} characters (letters, digits, . _ : -).`,
      };
    }
    conversationId = id;
  }

  return { ok: true, value: { question, history, conversationId } };
}

/**
 * Anthropic key of the site, read from process.env at request time only. Never through
 * import.meta.env: Astro inlines those values into the server bundle at build time.
 */
function anthropicKey(): string | undefined {
  const proc: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {};
  return proc.ANTHROPIC_API_KEY_IFIXX_SITE || undefined;
}

/** Waits for p at most ms; never rejects. */
async function waitAtMost(p: Promise<unknown>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    p.catch(() => {}),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, Math.max(0, ms));
    }),
  ]);
  clearTimeout(timer);
}

export const POST: APIRoute = async ({ request }) => {
  const started = Date.now();
  const parsed = await readJson(request, LIMITS.bodyMaxBytes);
  if (!parsed.ok) return bad(parsed.error);
  const checked = validate(parsed.data);
  if (!checked.ok) return bad(checked.error);
  const { question, history, conversationId } = checked.value;

  const estimate = { endpoint: '/api/agent/estimate', phone: BRAND.phone, hours: BRAND.hoursLabel };
  // Static answer to a person, with the introduction on the first turn (ruling R5).
  const fallbackAnswer = history.length === 0 ? `${VICTORIA_INTRO} ${FALLBACK_ANSWER}` : FALLBACK_ANSWER;
  const degradedReply = (status: number, extra: Record<string, unknown> = {}) =>
    jsonResponse(status, { answer: fallbackAnswer, conversationId, degraded: true, estimate, ...extra });

  try {
    const env = agentEnv(AGENT_SITE_ID_DEFAULT);
    const store: StoreEnv = { url: env.supabaseUrl, key: env.supabaseKey, site: env.site };
    const hash = ipHash(clientIp(request));

    // Counters answer -1 when the store is down: the question goes through.
    if ((await bump(store, `ask:ip:${hash}`, LIMITS.ipWindowSeconds)) > LIMITS.ask.perIpPerHour) {
      return degradedReply(429, { error: 'rate_limited' });
    }
    if ((await bump(store, 'ask:day', LIMITS.dayWindowSeconds)) > LIMITS.ask.perDay) {
      return degradedReply(200);
    }

    let services: ServiceSummary[] = [];
    try {
      services = await liveServices();
    } catch (err) {
      console.warn(`agent ask: service list unavailable: ${(err as Error)?.message ?? err}`);
    }

    const result = await answer(
      question,
      history,
      services,
      { apiKey: anthropicKey(), model: VICTORIA_MODEL },
      fetch,
      { budgetMs: REQUEST_BUDGET_MS - SAVE_WAIT_MS - (Date.now() - started) }
    );

    // The log never holds the answer for long, and a failure in it never reaches the visitor.
    const saving = saveConversation(store, {
      conversationId,
      question,
      answer: result.answer,
      matchedFaq: result.matchedFaq,
      flagged: result.flagged,
      violations: result.violations,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      userAgent: request.headers.get('user-agent')?.slice(0, USER_AGENT_MAX) || undefined,
      ipHash: hash,
      degraded: result.degraded,
    });
    await waitAtMost(saving, Math.min(SAVE_WAIT_MS, REQUEST_BUDGET_MS - (Date.now() - started)));

    console.log(
      `Agent ask: conv ${conversationId} | ${result.matchedFaq ?? 'drafted'} | flagged ${result.flagged} | degraded ${result.degraded}`
    );
    return jsonResponse(200, {
      answer: result.answer,
      conversationId,
      ...(result.matchedFaq ? { matchedFaq: result.matchedFaq } : {}),
      degraded: result.degraded,
      estimate,
    });
  } catch (err) {
    console.error('agent ask: unexpected error:', err);
    return degradedReply(200);
  }
};

export const OPTIONS: APIRoute = () => optionsResponse();
