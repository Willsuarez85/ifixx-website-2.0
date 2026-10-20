import { describe, expect, it, vi } from 'vitest';
import { APPROVED_FAQ, FALLBACK_ANSWER, VICTORIA_INTRO, type ServiceSummary } from '../src/lib/agent-facts';
import { answer, classify, exactMatch, generate, normalizeQuestion, type LlmEnv, type Turn } from '../src/lib/victoria';

const ENV: LlmEnv = { apiKey: 'test-key', model: 'claude-haiku-5-5' };
const NO_KEY: LlmEnv = { model: 'claude-haiku-5-5' };
const SERVICES: ServiceSummary[] = [
  { slug: 'screened-porches', title: 'Screened Porches', pillar: 'remodeling', summary: 'New screened porches.', url: '/remodeling/screened-porches' },
];
const faq = (id: string) => APPROVED_FAQ.find((f) => f.id === id)!;

/** Anthropic Messages response with one text block. */
const reply = (text: string, usage = { input_tokens: 10, output_tokens: 2 }) =>
  new Response(JSON.stringify({ content: [{ type: 'text', text }], usage }), { status: 200 });

/**
 * Simulated fetch: the classify call (max_tokens 10) answers `classified`, the generate
 * call (max_tokens 300) answers `generated`. Records every request body.
 */
function model(classified: string, generated = 'Yes, we build screened porches in Waxhaw.') {
  const bodies: any[] = [];
  const fetchImpl = vi.fn(async (_url: any, init: RequestInit = {}) => {
    const body = JSON.parse(String(init.body));
    bodies.push({ body, headers: init.headers });
    return body.max_tokens === 10 ? reply(classified) : reply(generated, { input_tokens: 900, output_tokens: 30 });
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, bodies };
}

describe('normalizeQuestion and exactMatch', () => {
  it('normalizes case, punctuation and spaces', () => {
    expect(normalizeQuestion('  What ARE the   business hours?? ')).toBe('what are the business hours');
    expect(normalizeQuestion('Do you do plumbing, electrical or HVAC?')).toBe('do you do plumbing electrical or hvac');
  });

  it('matches the approved question exactly, with or without punctuation and case', () => {
    expect(exactMatch('What are the business hours?')?.id).toBe('faq-09');
    expect(exactMatch('what are the business hours')?.id).toBe('faq-09');
    expect(exactMatch('What are the business hours?')?.a).toBe(faq('faq-09').a);
  });

  it('returns null for a question that is not approved', () => {
    expect(exactMatch('do you fly to the moon')).toBeNull();
  });
});

describe('classify', () => {
  it('returns the approved id the model picks', async () => {
    const { fetchImpl, bodies } = model('faq-16');
    expect(await classify('Can you fix my wiring?', ENV, fetchImpl)).toBe('faq-16');
    const { body, headers } = bodies[0];
    expect(body.model).toBe('claude-haiku-5-5');
    expect(body.max_tokens).toBe(10);
    expect(body.temperature).toBeUndefined();
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.system).toContain('faq-16: Do you do plumbing, electrical or HVAC?');
    expect(body.messages).toEqual([{ role: 'user', content: 'Can you fix my wiring?' }]);
    expect((headers as Record<string, string>)['x-api-key']).toBe('test-key');
    expect((headers as Record<string, string>)['anthropic-version']).toBe('2023-06-01');
  });

  it('returns null for an unknown answer or "none"', async () => {
    expect(await classify('x', ENV, model('banana').fetchImpl)).toBeNull();
    expect(await classify('x', ENV, model('none').fetchImpl)).toBeNull();
    expect(await classify('x', ENV, model('faq-99').fetchImpl)).toBeNull();
  });

  it('throws when the API fails, so a failure is never read as "none"', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 500 })) as unknown as typeof fetch;
    await expect(classify('x', ENV, fetchImpl)).rejects.toThrow();
  });
});

describe('generate', () => {
  it('sends the system prompt, history and question; drops leading assistant turns', async () => {
    const { fetchImpl, bodies } = model('none');
    const history: Turn[] = [
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'How can I help?' },
    ];
    const out = await generate('Porches in Waxhaw?', history, SERVICES, ENV, fetchImpl);
    expect(out).toEqual({ text: 'Yes, we build screened porches in Waxhaw.', tokensIn: 900, tokensOut: 30 });
    const { body } = bodies[0];
    expect(body.max_tokens).toBe(300);
    expect(body.temperature).toBeUndefined();
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.system).toContain('Screened Porches');
    expect(body.messages).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'How can I help?' },
      { role: 'user', content: 'Porches in Waxhaw?' },
    ]);
  });
});

describe('answer', () => {
  it('approved answer verbatim on an exact match, with no model call and no key needed', async () => {
    const { fetchImpl } = model('none');
    const r = await answer('What are the business hours?', [{ role: 'user', content: 'hi' }], SERVICES, NO_KEY, fetchImpl);
    expect(r.answer).toBe(faq('faq-09').a);
    expect(r.matchedFaq).toBe('faq-09');
    expect(r.degraded).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('classified question returns the file text, not model text', async () => {
    const { fetchImpl } = model('faq-16');
    const r = await answer('Can you rewire my kitchen?', [{ role: 'user', content: 'hi' }], SERVICES, ENV, fetchImpl);
    expect(r.answer).toBe(faq('faq-16').a);
    expect(r.matchedFaq).toBe('faq-16');
    expect(r.flagged).toBe(false);
    expect(r.model).toBe('claude-haiku-5-5');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('generated answer with an unlisted dollar figure is discarded: fallback, flagged', async () => {
    const { fetchImpl } = model('none', 'Sure, it is usually around $2,500.');
    const r = await answer('How much for a porch?', [{ role: 'user', content: 'hi' }], SERVICES, ENV, fetchImpl);
    expect(r.flagged).toBe(true);
    expect(r.answer).toBe(FALLBACK_ANSWER);
    expect(r.violations.length).toBeGreaterThan(0);
    expect(r.degraded).toBe(false);
  });

  it('missing API key: fallback, degraded', async () => {
    const { fetchImpl } = model('none');
    const r = await answer('Do you install solar panels?', [{ role: 'user', content: 'hi' }], SERVICES, NO_KEY, fetchImpl);
    expect(r.degraded).toBe(true);
    expect(r.answer).toBe(FALLBACK_ANSWER);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('API answers 429: fallback, degraded, no generation', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"type":"error"}', { status: 429 })) as unknown as typeof fetch;
    const r = await answer('Do you install solar panels?', [{ role: 'user', content: 'hi' }], SERVICES, ENV, fetchImpl);
    expect(r.degraded).toBe(true);
    expect(r.answer).toBe(FALLBACK_ANSWER);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('generation fails after a clean classification: fallback, degraded', async () => {
    const fetchImpl = vi.fn(async (_u: any, init: RequestInit = {}) =>
      JSON.parse(String(init.body)).max_tokens === 10 ? reply('none') : new Response('{}', { status: 529 })
    ) as unknown as typeof fetch;
    const r = await answer('Do you install solar panels?', [{ role: 'user', content: 'hi' }], SERVICES, ENV, fetchImpl);
    expect(r.degraded).toBe(true);
    expect(r.answer).toBe(FALLBACK_ANSWER);
  });

  it('a model that never answers is cut by the time budget', async () => {
    const fetchImpl = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;
    const t0 = Date.now();
    const r = await answer('Do you install solar panels?', [{ role: 'user', content: 'hi' }], SERVICES, ENV, fetchImpl, { budgetMs: 100 });
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(r.degraded).toBe(true);
    expect(r.answer).toBe(FALLBACK_ANSWER);
  });

  it('skips generation when less than 1.5 s of budget remains after classification', async () => {
    const fetchImpl = vi.fn(async () => {
      await new Promise((res) => setTimeout(res, 200));
      return reply('none');
    }) as unknown as typeof fetch;
    const r = await answer('Do you install solar panels?', [{ role: 'user', content: 'hi' }], SERVICES, ENV, fetchImpl, { budgetMs: 1600 });
    expect(r.degraded).toBe(true);
    expect(r.answer).toBe(FALLBACK_ANSWER);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('first turn: a clean generated answer starts with the introduction; tokens add up', async () => {
    const { fetchImpl } = model('none');
    const r = await answer('Do you install screened porches in Waxhaw?', [], SERVICES, ENV, fetchImpl);
    expect(r.answer.startsWith(VICTORIA_INTRO + ' ')).toBe(true);
    expect(r.answer).toBe(`${VICTORIA_INTRO} Yes, we build screened porches in Waxhaw.`);
    expect(r.flagged).toBe(false);
    expect(r.tokensIn).toBe(910);
    expect(r.tokensOut).toBe(32);
  });

  it('first turn: approved and fallback answers carry the introduction too, never twice', async () => {
    const exact = await answer('What are the business hours?', [], SERVICES, NO_KEY);
    expect(exact.answer).toBe(`${VICTORIA_INTRO} ${faq('faq-09').a}`);

    const fallback = await answer('Do you install solar panels?', [], SERVICES, NO_KEY);
    expect(fallback.answer).toBe(`${VICTORIA_INTRO} ${FALLBACK_ANSWER}`);

    const ai = await answer('Are you an AI?', [], SERVICES, NO_KEY);
    expect(ai.answer).toBe(faq('faq-27').a);
  });

  it('later turns carry no introduction', async () => {
    const { fetchImpl } = model('none');
    const r = await answer('And in Waxhaw?', [{ role: 'user', content: 'Do you build porches?' }], SERVICES, ENV, fetchImpl);
    expect(r.answer).toBe('Yes, we build screened porches in Waxhaw.');
  });
});
