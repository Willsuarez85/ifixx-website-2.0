import type { APIRoute } from 'astro';
import { gone } from '../../lib/gone';

// Retired 2026-09-17, same reason as /emergency-services/fixture-repair: the whole
// landing sold faucets, toilets, supply lines and drain clearing, which iFIXX does not
// market. It was an Ads-only landing (noindex, out of the sitemap); Ads has been running
// on fences and decks since July 2026, so it had no live campaign pointing at it.
// Verify no ad group still uses it as a final URL before this ships.
export const prerender = false;

export const GET: APIRoute = gone;
export const ALL: APIRoute = gone;
