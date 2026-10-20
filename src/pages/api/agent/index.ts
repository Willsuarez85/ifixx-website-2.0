import type { APIRoute } from 'astro';
import { apiDescription } from '../../../lib/agent-facts';
import { jsonResponse, optionsResponse } from '../../../lib/agent-http';
import { SERVICE_TAGS } from '../../../lib/lead-intake';

export const prerender = false;

/** Machine-readable description of the agent API, with the live service keys. */
export const GET: APIRoute = () => jsonResponse(200, apiDescription(Object.keys(SERVICE_TAGS)));

export const OPTIONS: APIRoute = () => optionsResponse();
