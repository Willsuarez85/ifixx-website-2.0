import { getCollection } from 'astro:content';
import type { ServiceSummary } from './agent-facts';
import { isRetiredService } from './seo-retired';

interface ServiceEntryLike {
  slug: string;
  data: { title: string; pillar: 'repairs' | 'remodeling'; summary: string };
}

/**
 * Pure mapping from content-collection entries to ServiceSummary. Mirrors the filter of
 * src/pages/repairs/[serviceSlug].astro and src/pages/remodeling/[serviceSlug].astro:
 * a service is listed only if its pillar page is generated (not retired).
 */
export function toServiceSummaries(entries: ServiceEntryLike[]): ServiceSummary[] {
  return entries
    .filter((s) => !isRetiredService(s.slug))
    .map((s) => ({
      slug: s.slug,
      title: s.data.title,
      pillar: s.data.pillar,
      summary: s.data.summary,
      url: `/${s.data.pillar}/${s.slug}`,
    }));
}

/** Services that have a live page. The only module that reads the services collection for the agent layer. */
export async function liveServices(): Promise<ServiceSummary[]> {
  return toServiceSummaries(await getCollection('services'));
}
