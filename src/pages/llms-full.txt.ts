import type { APIRoute } from 'astro';
import { renderLlmsFull } from '../lib/agent-facts';
import { liveServices } from '../lib/services-live';

export const GET: APIRoute = async () =>
  new Response(renderLlmsFull(await liveServices()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
