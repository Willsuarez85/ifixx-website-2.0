/**
 * Store of the AI-agent layer in Supabase (PostgREST over fetch, no SDK): rate-limit
 * rolling-window events, estimate-request dedup and the conversation log. The base tables are
 * followed by hardening migrations in supabase/migrations/.
 *
 * Protection calls return null on an unavailable or malformed store response. Callers
 * decide whether a feature may degrade; the estimate endpoint always fails closed before
 * touching the CRM.
 */

export interface StoreEnv {
  url?: string;
  key?: string;
  site: string;
}

const TIMEOUT_MS = 1500;

/** StoreEnv objects that already logged the alarm (the caller's object is never mutated). */
const reported = new WeakSet<StoreEnv>();

function unprotected(env: StoreEnv, reason: string): void {
  if (reported.has(env)) return;
  reported.add(env);
  console.error('agent-store:unprotected', reason);
}

async function rest(env: StoreEnv, path: string, init: RequestInit = {}): Promise<Response | null> {
  if (!env.url || !env.key) {
    console.warn(`agent-store: SUPABASE_URL or SUPABASE_SERVICE_KEY missing, skipping ${path.split('?')[0]}`);
    unprotected(env, 'store not configured (SUPABASE_URL or SUPABASE_SERVICE_KEY missing)');
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
      console.warn(`agent-store: ${path.split('?')[0]} answered ${res.status}`);
      unprotected(env, `${path.split('?')[0]} answered ${res.status}`);
      return null;
    }
    return res;
  } catch {
    console.warn(`agent-store: ${path.split('?')[0]} request failed`);
    unprotected(env, `${path.split('?')[0]} request failed`);
    return null;
  }
}

export interface LimitConsumption {
  allowed: boolean;
  remaining: number;
}

/** Atomically records one request if the exact rolling-window hard cap permits it. */
export async function consumeRollingLimit(
  env: StoreEnv,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<LimitConsumption | null> {
  const res = await rest(env, 'rpc/consume_agent_limit', {
    method: 'POST',
    body: JSON.stringify({
      p_site: env.site,
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    }),
  });
  if (!res) return null;
  try {
    const rows = await res.json();
    const value = Array.isArray(rows) ? rows[0] : rows;
    return typeof value?.allowed === 'boolean' && Number.isInteger(value?.remaining) && value.remaining >= 0
      ? { allowed: value.allowed, remaining: value.remaining }
      : null;
  } catch {
    return null;
  }
}

export interface EstimateReservation {
  acquired: boolean;
  reference: string;
  status: 'pending' | 'completed';
  routingStatus: 'pending' | 'complete' | 'incomplete';
}

/** Atomically reserves an exact normalized request before the CRM is called. */
export async function reserveEstimate(
  env: StoreEnv,
  row: {
    payloadHash: string;
    phoneHash: string;
    reference: string;
    withinSeconds: number;
    vendor?: string;
    conversationId?: string;
  }
): Promise<EstimateReservation | null> {
  const res = await rest(env, 'rpc/reserve_agent_estimate', {
    method: 'POST',
    body: JSON.stringify({
      p_site: env.site,
      p_payload_hash: row.payloadHash,
      p_phone_hash: row.phoneHash,
      p_reference: row.reference,
      p_window_seconds: row.withinSeconds,
      p_vendor: row.vendor ?? null,
      p_conversation_id: row.conversationId ?? null,
    }),
  });
  if (!res) return null;
  try {
    const rows = await res.json();
    const value = Array.isArray(rows) ? rows[0] : rows;
    return typeof value?.acquired === 'boolean' && typeof value?.reference === 'string' && value.reference &&
      (value?.reservation_status === 'pending' || value?.reservation_status === 'completed') &&
      (value?.routing_status === 'pending' || value?.routing_status === 'complete' || value?.routing_status === 'incomplete')
      ? {
          acquired: value.acquired,
          reference: value.reference,
          status: value.reservation_status,
          routingStatus: value.routing_status,
        }
      : null;
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

/** Marks an existing reservation completed after the CRM succeeds. */
export async function completeEstimate(
  env: StoreEnv,
  row: { payloadHash: string; reference: string; contactId: string; routingStatus: 'complete' | 'incomplete' }
): Promise<boolean> {
  const res = await rest(env, 'rpc/complete_agent_estimate', {
    method: 'POST',
    body: JSON.stringify({
      p_site: env.site,
      p_payload_hash: row.payloadHash,
      p_reference: row.reference,
      p_contact_id: row.contactId,
      p_routing_status: row.routingStatus,
    }),
  });
  if (!res) return false;
  try {
    return (await res.json()) === true;
  } catch {
    return false;
  }
}

/** Releases a pending reservation after a CRM failure so a real retry can proceed. */
export async function releaseEstimate(
  env: StoreEnv,
  row: { payloadHash: string; reference: string }
): Promise<boolean> {
  const res = await rest(env, 'rpc/release_agent_estimate', {
    method: 'POST',
    body: JSON.stringify({ p_site: env.site, p_payload_hash: row.payloadHash, p_reference: row.reference }),
  });
  if (!res) return false;
  try {
    return (await res.json()) === true;
  } catch {
    return false;
  }
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
