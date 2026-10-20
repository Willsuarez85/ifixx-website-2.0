/**
 * Store of the AI-agent layer in Supabase (PostgREST over fetch, no SDK): rate-limit
 * counters, estimate-request dedup and the conversation log. Tables and the
 * bump_counter function are in supabase/migrations/2026-10-21-agent-layer.sql.
 *
 * The store is never on the critical path: if the variables are missing or a request
 * fails, every function returns its "allowed" value (counter -1, no duplicate, not
 * saved), logs a warning and the endpoint carries on. Nothing here throws.
 */

export interface StoreEnv {
  url?: string;
  key?: string;
  site: string;
}

const TIMEOUT_MS = 3000;

async function rest(env: StoreEnv, path: string, init: RequestInit = {}): Promise<Response | null> {
  if (!env.url || !env.key) {
    console.warn(`agent-store: SUPABASE_URL or SUPABASE_SERVICE_KEY missing, skipping ${path.split('?')[0]}`);
    return null;
  }
  try {
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(TIMEOUT_MS) : undefined;
    const res = await fetch(`${env.url.replace(/\/+$/, '')}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: env.key,
        Authorization: `Bearer ${env.key}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn(`agent-store: ${path.split('?')[0]} answered ${res.status} ${detail.slice(0, 200)}`);
      return null;
    }
    return res;
  } catch (err) {
    console.warn(`agent-store: ${path.split('?')[0]} failed: ${(err as Error)?.message ?? err}`);
    return null;
  }
}

/** Adds one to the (site, key) counter in the current window; returns the count, or -1 without a store. */
export async function bump(env: StoreEnv, key: string, windowSeconds: number): Promise<number> {
  const res = await rest(env, 'rpc/bump_counter', {
    method: 'POST',
    body: JSON.stringify({ p_site: env.site, p_key: key, p_window_seconds: windowSeconds }),
  });
  if (!res) return -1;
  try {
    const n = Number(await res.json());
    return Number.isFinite(n) ? n : -1;
  } catch {
    return -1;
  }
}

/** Reference of a lead saved for the same phone hash in the last withinSeconds, or null. */
export async function recentLeadReference(env: StoreEnv, phoneHash: string, withinSeconds: number): Promise<string | null> {
  const since = new Date(Date.now() - withinSeconds * 1000).toISOString();
  const q = new URLSearchParams({
    select: 'reference',
    site: `eq.${env.site}`,
    phone_hash: `eq.${phoneHash}`,
    created_at: `gte.${since}`,
    order: 'created_at.desc',
    limit: '1',
  });
  const res = await rest(env, `agent_leads?${q.toString()}`, { method: 'GET' });
  if (!res) return null;
  try {
    const rows = await res.json();
    const ref = Array.isArray(rows) ? rows[0]?.reference : undefined;
    return typeof ref === 'string' && ref ? ref : null;
  } catch {
    return null;
  }
}

async function insert(env: StoreEnv, table: string, row: Record<string, unknown>): Promise<boolean> {
  const res = await rest(env, table, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ site: env.site, ...row }),
  });
  return res !== null;
}

/** Records a lead sent to the CRM (for dedup and counting). Returns whether it was saved. */
export async function saveLead(
  env: StoreEnv,
  row: { reference: string; phoneHash: string; vendor?: string; conversationId?: string; contactId: string }
): Promise<boolean> {
  return insert(env, 'agent_leads', {
    reference: row.reference,
    phone_hash: row.phoneHash,
    vendor: row.vendor ?? null,
    conversation_id: row.conversationId ?? null,
    contact_id: row.contactId,
  });
}

/** Logs one question and answer of the chat endpoint. Returns whether it was saved. */
export async function saveConversation(
  env: StoreEnv,
  row: {
    conversationId: string;
    question: string;
    answer: string;
    matchedFaq?: string;
    flagged: boolean;
    violations: string[];
    model?: string;
    tokensIn?: number;
    tokensOut?: number;
    userAgent?: string;
    ipHash: string;
    degraded: boolean;
  }
): Promise<boolean> {
  return insert(env, 'agent_conversations', {
    conversation_id: row.conversationId,
    question: row.question,
    answer: row.answer,
    matched_faq: row.matchedFaq ?? null,
    flagged: row.flagged,
    violations: row.violations,
    model: row.model ?? null,
    tokens_in: row.tokensIn ?? null,
    tokens_out: row.tokensOut ?? null,
    user_agent: row.userAgent ?? null,
    ip_hash: row.ipHash,
    degraded: row.degraded,
  });
}
