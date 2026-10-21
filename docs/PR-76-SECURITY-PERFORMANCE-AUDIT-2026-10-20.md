# PR 76 security and performance audit

Audited snapshot: `2a634dae..87750069` (`agent-layer` into `main`). GitHub already showed PR 76 as merged when the audit began. No production endpoint, CRM, Supabase project, or model endpoint was called.

## Findings in the merged snapshot

| ID | Severity | File:line | Finding | Exploit or failure scenario | Suggested fix |
|---|---|---|---|---|---|
| F01 | High | `src/pages/api/agent/estimate.ts:191-211` | A configured but unavailable Supabase store fails open and removes every CRM abuse control. | A simulated Supabase 503 still produced a CRM upsert and HTTP 200 because failed counters returned an allowed sentinel and dedup returned no match. | Fail closed before CRM work whenever any counter or reservation cannot be confirmed. |
| F02 | High | `src/lib/agent-facts.ts:350-359,532-542` | `llms-full.txt` publishes 26 candidate answers while the owner-approval gate is closed. | Crawlers can treat unapproved pricing, timing, service-area, insurance, and service-scope wording as approved business facts before the owner accepts it. | Publish no candidate FAQ wording until the same explicit approval gate enables the answer set. |
| F03 | Medium | `src/lib/victoria.ts:328-338`; `src/lib/agent-guardrail.ts:159-222` | Model-drafted answers reach callers after a regex denylist that is not a semantic safety boundary. | Simulated drafts using `licenced`, invisible/fullwidth Unicode, word-form prices, unfamiliar towns, double negation, dates, or external payment details passed the guardrail. The real model producing these strings is unverified. | Restrict output to approved answers or templates selected by ID; do not expose free-form model wording. |
| F04 | High | `src/lib/lead-intake.ts:229-243,332-433` | Estimate intake has no CRM timeout and may perform 14 sequential calls plus 9.6 seconds of sleeps. | At 100 ms per CRM call the path already exceeds 11 seconds; a hung call can hold the unauthenticated function indefinitely and amplify resource use. | Apply one total deadline to the agent path and preserve safe contact-only reconciliation after a confirmed upsert. |
| F05 | Medium | `src/pages/api/agent/estimate.ts:198-204,241-247` | Dedup is a check-then-write operation performed around the CRM call. | Two concurrent identical requests were reproduced creating two CRM writes and two references, both returning 200. | Atomically reserve an idempotency key before CRM work, then mark it complete or safely pending. |
| F06 | Medium | `src/pages/api/agent/estimate.ts:198-203` | Phone-only dedup conflates different requests and discloses the prior reference to anyone who knows the phone. | For ten minutes, changed service/message/identity data is silently discarded and the previous reference is returned. | Bind dedup to the normalized payload and expose pending/completed state without phone-only lookup. |
| F07 | Medium | `supabase/migrations/2026-10-21-agent-layer.sql:61-75` | Fixed clock windows allow boundary bursts and rotating IPs can consume the site-wide cap or model budget. | One IP can send five requests immediately before and after an hourly boundary; distributed callers can exhaust the 50-lead or 500-question daily allowance and deny legitimate traffic. | Use exact atomic rolling windows and retain a site-wide hard cap; add an upstream WAF or signed caller quota when available. |
| F08 | Medium | `src/lib/agent-http.ts:47-92` | Request-body reads have a byte limit but no deadline. | A stream that sends one chunk and never closes remains pending before abuse controls run; effective exposure through Vercel is unverified. | Cancel body reading on a short deadline inside the request budget. |
| F09 | Medium | `src/pages/api/agent/ask.ts:145-150`; `src/lib/services-live.ts:32-33` | Runtime `astro:content` loading expands the shared serverless bundle from 423,526 to 2,353,719 bytes. | Every dynamic route, including the existing lead route, pays a larger cold-start and deployment bundle cost; end-to-end latency under ten seconds is not guaranteed. | Keep runtime handlers on a small generated manifest and reserve content collections for build time. |
| F10 | Low | `src/pages/api/lead.ts:68-69` | The live form reads CRM secrets through build-inlined `import.meta.env`. | A server artifact contains the built value and secret rotation requires a rebuild; exposure in the production artifact is unverified. | Read server secrets from `process.env` at request time. |
| F11 | Low | `src/lib/lead-intake.ts:268-285,631-670`; `src/lib/agent-store.ts:46-54` | Logs include raw upstream response bodies or objects that may contain personal data. | A CRM error or missing contact ID can place names, email addresses, phone numbers, or provider details in logs. | Log only status, a safe error code, and a request identifier. |
| F12 | Medium | `src/lib/agent-store.ts:39-41` | The Supabase service-role credential has project-wide RLS bypass rather than access limited to agent tables. | If the server credential or function is compromised, unrelated data in the same project may be reachable; the actual project contents and inherited grants are unverified. | Use an isolated project or a narrowly scoped backend role/RPC credential, and verify deployed grants. |
| F13 | Low | `supabase/migrations/2026-10-21-agent-layer.sql:30-49` | Questions, answers, user agents, IP hashes, counters, and dedup records have no retention policy. | Personal questions and pseudonymous identifiers accumulate indefinitely, increasing privacy and breach impact. | Define TTLs and scheduled pruning for conversations, rate events, and expired reservations. |
| F14 | Low | `src/pages/api/agent/estimate.ts:17,93-125` | URL filtering misses bare domains, non-HTTP schemes, and some text-to-link variants before CRM notes. | A malicious caller can place phishing-shaped text in CRM fields if the downstream UI auto-links it; actual GHL rendering is unverified. | Normalize Unicode/IDNA, reject URI schemes and link-shaped domains, and keep downstream fields plain text. |

## Remediation after the merge

Local `agent-layer` commits `6c00836`, `2143511`, `83bb7cc`, `34f9c0f`, and `2492781` address F01-F11 and F14, preserve `/api/lead`, reduce the server bundle to about 0.50 MB, and add 297 passing tests. F12 remains an architecture decision. F13 is partly addressed for rolling-limit events, but conversation and lead retention still need an approved policy. A residual low edge such as `example.com&1` may evade the best-effort link detector; GHL fields must remain plain text.

The follow-up SQL has only static and mocked coverage. Applying migrations 22 and 23, exercising their RPCs with the deployed role, and testing real concurrency in a non-production Supabase project are unverified and required before production use.

## Dismissed or verified safe

- IP spoofing through Vercel was not confirmed: Vercel documents that it overwrites its forwarding headers. Fallback headers remain unsafe if the origin is exposed outside that proxy.
- Prototype-key injection was not reproduced: the handler uses explicit fields and a fixed service-key allowlist.
- CORS is intentionally open but does not allow credentials; public error bodies are generic and responses use `no-store`.
- The original migration enables RLS, revokes anonymous/authenticated access, keeps RPCs `SECURITY INVOKER`, sets an explicit `search_path`, and restricts execution to `service_role`.
- No literal secret was found in source, tests, fixtures, or the local build made without production environment values. The deployed artifact remains unverified.
- Extraction of `lead-intake.ts` did not change the existing form sequence in the audited snapshot; characterization tests passed.
- The llms endpoints add negligible build work, business JSON-LD adds only a few hundred HTML bytes, and no new browser JavaScript was shipped.

## Independent night review, 2026-10-20

Reviewed from a fresh worktree on `agent-layer` at `edcdcc1` (contains `origin/main` at `baeb509`). Every diff against `origin/main` was read in full; no summary was trusted. No production endpoint, CRM, Supabase project, model endpoint or GitHub remote was touched. No credentials were requested or read.

### Verification run

| Check | Result |
|---|---|
| `vitest run` | 299 passed, 13 files (297 before this review, 2 added) |
| `scripts/test-attribution.mjs` | 11 PASS, 0 FAIL |
| `npm run build` + `verify:links` | exit 0, 56 pages, no broken links |
| Server bundle (`_render.func`, own `.mjs` without `node_modules`) | 499,125 bytes (merged snapshot: 2,353,719) |
| Internal names, local paths or key-shaped strings in `origin/main..agent-layer` | 0 hits |
| SQL execution, grants in effect, Postgres concurrency | **unverified**: no non-production database was available in this session |

### Finding by finding

| ID | Status | Evidence in code and tests |
|---|---|---|
| F01 | Confirmed fixed | `estimate.ts` returns 503 before any CRM call when the store is unconfigured, unreachable, or answers a malformed row for the IP limit, the reservation or the daily limit; `agent-store.ts` returns `null` instead of an allowed sentinel. Tests: store down, store env missing, reserve and day RPC failures. |
| F02 | Confirmed fixed | `publishedFaq(false)` returns an empty list; `llms-full.txt` prints no candidate answer until `ASK_ANNOUNCED`. |
| F03 | Confirmed fixed | `victoria.ts` no longer drafts: exact match, classifier to an approved id, or the fixed fallback. `generate`, the history quoting and the Spanish check were removed with their call sites. The guardrail remains only as a build-time check on service summaries. |
| F04 | Confirmed fixed | `submitLead` takes `totalTimeoutMs`; `estimate.ts` passes 8,000 ms. Every fetch, body read and sleep in the agent path shares the deadline. The website form path passes no options and keeps unbounded fetches and fixed waits; a test asserts no `AbortSignal` is attached there. |
| F05 | Confirmed fixed in code; database unverified | `reserve_agent_estimate` takes a transaction advisory lock on the site and payload hash, then selects or inserts. Concurrency is proven only against a mocked atomic store. One non-duplicating side effect remains: if the store commits the reservation but answers after the 1,500 ms client timeout, or a release after a refused daily limit or a definitive CRM rejection fails, a `pending` row with no `contact_id` blocks identical retries with 202 for the 10-minute window and then surfaces to reconciliation as safe to delete. Documented in the migration comment and the README. |
| F06 | Confirmed fixed | Dedup key is the hash of the normalized payload; an in-progress twin answers 202 `request_in_progress`; a completed twin answers 200 with the stored routing state. A phone alone no longer returns another request's reference. |
| F07 | Confirmed fixed in code; database unverified | `consume_agent_limit` counts and inserts under a per-key advisory lock with `clock_timestamp()` taken after the lock. Limits and windows are pinned inside SQL and checked against the caller's values. |
| F08 | Confirmed fixed | `readJson` cancels the reader after 2,000 ms; test with a stream that never closes. |
| F09 | Confirmed fixed | `ask.ts` no longer imports `services-live`; `astro:content` stays in the prerendered llms routes and the layout. Bundle measured above. |
| F10 | Confirmed fixed in code; runtime unverified | `lead.ts` reads both CRM variables from `process.env`. The deployment must expose them at runtime, which this review could not check. |
| F11 | Confirmed fixed | Logs carry status codes and fixed messages; no upstream body or payload object. The characterization fixture changed only in its `logs` arrays; the recorded CRM requests and HTTP responses are byte-identical. |
| F12 | Open, decision needed | Unchanged. Proposal below. |
| F13 | Partial | Rate events are pruned past 24 hours inside the RPC. Conversations and leads still have no retention. Proposal below. |
| F14 | Best-effort filter; residual repaired tonight | See N02 and the known misses under Discarded. The check is a heuristic over plain text, not a parser; the CRM must keep these fields as plain text regardless. |

### New findings in this review

| ID | Severity | Status | Detail |
|---|---|---|---|
| N01 | Low | Fixed, `e0641e5` | `consume_agent_limit` pruned expired rows before taking the per-key advisory lock and deleted the key's own expired rows after it. A caller holding row locks from its prune while queuing for the advisory lock could be waited on by the lock holder's scoped delete whenever an event crossed the 24-hour boundary between the two prunes. Postgres would abort one transaction, turning one legitimate request into a 503. Both deletes now select rows with `FOR UPDATE SKIP LOCKED`; expired rows are never counted, so skipping them is safe. Needs the same database run as the rest of the SQL. |
| N02 | Low | Fixed, `78f08ea` | Reproduced the residual: `example.com&1`, `example.com$1`, `example.com+1`, `example.com~`, `example.com^` and `<example.com>` passed the bare-domain check because the candidate split did not break on those characters and IDNA conversion rejected the glued token. A strict second cut isolates hostname-shaped runs; the loose cut is kept so emoji and symbolic TLDs are still caught. The independent review then showed IPv4 literals (`1.2.3.4`, `192.168.0.1/admin`) and hosts with a leading or trailing dot or hyphen (`.example.com`, `-example.com`, `example.com-`) still passed; both are now rejected (`IPV4_LITERAL`, edge trimming) with tests. Structured email and ZIP fields are untouched; a prose message with prices, ampersands and measurements still passes. |

### Static audit of migrations 22 and 23

- Idempotent: `add column if not exists`, `create index if not exists`, `create or replace function`, `create table if not exists`. Re-running either file is safe.
- Locks: transaction-scoped advisory locks keyed by `hashtextextended`, released at commit; row locks only from the two deletes, now skip-locked (N01). Reservation lookback uses transaction time; limit timestamps use `clock_timestamp()` after the lock.
- Grants and roles: every function is `security invoker` with `search_path = ''` and fully qualified references; execute revoked from `public`, `anon`, `authenticated` and granted to `service_role`. `agent_rate_events` has RLS enabled with no policies and explicit `select, insert, delete` for `service_role`. Existing `agent_leads` privileges for `service_role` are inherited from the original migration and from project defaults, which were not inspected.
- Column defaults: `agent_leads.status` defaults to `completed` for pre-existing rows, then `routing_status` defaults to `pending` for new rows; the RPC sets both explicitly, so defaults only matter for rows written outside it.
- Rollback: none shipped. Manual reversal is `drop function` for the four RPCs, `drop table public.agent_rate_events`, and leaving the three nullable or defaulted columns in place. The old `bump_counter` function and `agent_counters` table remain and can be dropped once the new RPCs are confirmed.
- Not verified without a database: syntax acceptance, the `return query` column typing, `ctid in (select ... for update skip locked)` on the target table, effective privileges, and behavior under real concurrent sessions.

### Discarded, with reasons

- `clean()` now collapses newlines in `message` before it reaches Project Notes. It is a readability change in the CRM note, not a failure; it is what allows the Unicode-dot canonicalization. Left as is.
- The scheme check rejects any `word:nonspace` token (for example `Re:deck`). It is a deliberate widening to catch `javascript:`, `data:` and similar schemes; the assistant receives a clear 400 and can rephrase. Left as is.
- Abbreviations written without a space such as `sq.ft` or `Mr.Smith` are rejected as bare domains. Pre-existing in the branch, same mitigation. Left as is.
- Rolling-limit prune on every call is now a semi-join on `ctid` whose subquery scans the time index and usually matches nothing; acceptable at the documented caps, plan unverified without a database.
- Known misses of the bare-domain heuristic after tonight: spaced or spelled dots (`example .com`, `example dot com`, `example[.]com`), empty inner labels (`example..com`) and any string a downstream UI chooses to auto-link. Known new false positives: a symbol glued before a missing-space period (`Q&A.Thanks`, `kitchen&bath.Remodel`, `$25+tax.Thanks`) is now rejected like `sq.ft`; same mitigation, the assistant gets a 400 naming the field.
- The N01 change edits the `2026-10-23` migration file in place. That is safe only because the file has never been applied anywhere (the store variables are not yet set in the deployment); a database that already ran the earlier text would need the function re-created from this file.
- The environment variable the code reads is `SUPABASE_SERVICE_KEY`. Any deployment note that names a different variable must be corrected before enabling the store.

### Proposals for decision, not decided here

**F12, service-role scope.** Option A: a separate Supabase project that holds only the agent tables, so the credential in the function reaches nothing else; cheapest to reason about, one more project to maintain. Option B: in the current project, a dedicated Postgres role granted only `execute` on the five RPCs and `insert` on `agent_conversations`, exposed through PostgREST with a JWT whose `role` claim is that role; no RLS bypass, but it requires minting and rotating that JWT and adding the role to `authenticator`. Either option must be validated against the deployed grants before use.

**F13, retention.** Conversations: keep `question` and `answer` for 90 days, then null them and keep only the metadata row for counts; `ip_hash` and `user_agent` dropped at 30 days. Leads: completed rows keep `reference` and `contact_id` for 13 months to match one year of CRM follow-up; `pending` rows older than 30 days are closed by the reconciliation owner, never deleted silently. Rate events already expire at 24 hours. Implementation would be one scheduled SQL job per table, outside the request path.

### Verdict

**SHIP** as a local follow-up for review and publication: every code finding is confirmed fixed or fixed in this review, the website form's CRM traffic is unchanged, tests, attribution, build and bundle are clean, and nothing internal is in the diff. **Do not deploy** until migrations 22 and 23 run against a non-production database with the deployed role and a concurrency test, and until the owner decides F12, F13 and the reconciliation procedure.
