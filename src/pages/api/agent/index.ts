import type { APIRoute } from 'astro';
import { AGENT_SERVICE_KEYS, apiDescription, askEnabled } from '../../../lib/agent-facts';
import { jsonResponse, optionsResponse } from '../../../lib/agent-http';

export const prerender = false;

/** Machine-readable description of the agent API, with the agent service keys. Ask only while it is enabled. */
export const GET: APIRoute = () =>
  jsonResponse(200, apiDescription([...AGENT_SERVICE_KEYS], { includeAsk: askEnabled() }));

export const OPTIONS: APIRoute = () => optionsResponse();
