import type { APIRoute } from 'astro';
import { gone } from '../../lib/gone';

// Kept as a directly reachable endpoint. The retired URLs themselves are declared
// one by one under src/pages/** (see src/lib/gone.ts for why rewrites cannot do it).
export const prerender = false;

export const GET: APIRoute = gone;
export const ALL: APIRoute = gone;
