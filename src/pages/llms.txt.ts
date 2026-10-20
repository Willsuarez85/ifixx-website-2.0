import type { APIRoute } from 'astro';
import { renderLlmsTxt } from '../lib/agent-facts';
import { liveServices } from '../lib/services-live';

export const GET: APIRoute = async () =>
  new Response(renderLlmsTxt(await liveServices()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
