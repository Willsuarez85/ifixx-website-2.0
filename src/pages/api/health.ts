import type { APIRoute } from 'astro';

/**
 * Liveness check for the lead pipeline: can this deployment still reach GoHighLevel?
 *
 * Why it exists: the iFIXX private integration token was rotated on 2026-09-02 and
 * Vercel kept the old one. Every form on the site answered 500 from 2026-09-02 to
 * 2026-09-17 and nobody noticed, because a broken token looks exactly like a quiet
 * week of leads. POSTing a fake lead to /api/lead would have caught it, but it also
 * writes a contact into the CRM, so it is not something a monitor can run.
 *
 * This route does the cheapest read the token can make (GET the location it is scoped
 * to) and reports only whether it worked. Point an uptime monitor at it.
 *
 *   200 {"ok":true}
 *   503 {"ok":false,"reason":"missing_config"}   env vars absent in this deployment
 *   503 {"ok":false,"reason":"crm_401"}          token rejected: expired or rotated
 *   503 {"ok":false,"reason":"crm_<status>"}     any other CRM status
 *   503 {"ok":false,"reason":"crm_unreachable"}  network error or timeout
 *
 * It never returns the token, the location id, or anything the CRM sent back: the
 * body is a boolean and a reason string, so the endpoint is safe to leave public.
 */
export const prerender = false;

const CRM_TIMEOUT_MS = 8000;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });

export const GET: APIRoute = async () => {
  const apiKey = import.meta.env.GHL_API_KEY;
  const locationId = import.meta.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    return json(503, { ok: false, reason: 'missing_config' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CRM_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/locations/${encodeURIComponent(locationId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: '2021-07-28',
          Accept: 'application/json'
        },
        signal: controller.signal
      }
    );

    if (response.ok) {
      return json(200, { ok: true });
    }

    // 401 is the failure mode this endpoint was built for, so it gets its own reason.
    const reason = response.status === 401 ? 'crm_401' : `crm_${response.status}`;
    return json(503, { ok: false, reason });
  } catch {
    // Network error, DNS failure, or the abort above. No error detail is echoed back.
    return json(503, { ok: false, reason: 'crm_unreachable' });
  } finally {
    clearTimeout(timeout);
  }
};
