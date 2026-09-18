import type { APIRoute } from 'astro';
import { gone } from '../../lib/gone';

// Retired 2026-09-17: the page sold faucet, toilet, supply-line, shut-off valve and
// drain work. iFIXX does not market plumbing (CONTEXT.md, decision 2026-06-30), and
// nothing on the page survived the filter, so there is no equivalent to redirect to.
// Same mechanism as the other retired routes: a real 410 the adapter can serve.
export const prerender = false;

export const GET: APIRoute = gone;
export const ALL: APIRoute = gone;
