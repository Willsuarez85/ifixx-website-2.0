import { getCollection } from 'astro:content';
import type { ServiceSummary } from './agent-facts';
import { checkAnswer, DEFAULT_RULES } from './agent-guardrail';
import { isRetiredService } from './seo-retired';

interface ServiceEntryLike {
  slug: string;
  data: { title: string; pillar: 'repairs' | 'remodeling'; summary: string };
}

/**
 * Pure mapping from content-collection entries to ServiceSummary. Mirrors the filter of
 * src/pages/repairs/[serviceSlug].astro and src/pages/remodeling/[serviceSlug].astro:
 * a service is listed only if its pillar page is generated (not retired). Summaries that
 * fail the answer guardrail are published empty.
 */
export function toServiceSummaries(entries: ServiceEntryLike[]): ServiceSummary[] {
  return entries
    .filter((s) => !isRetiredService(s.slug))
    .map((s) => ({
      slug: s.slug,
      title: s.data.title,
      pillar: s.data.pillar,
      // Frontmatter is site copy we do not edit here; a summary that breaks a guardrail rule
      // (e.g. a job-timeline promise) is withheld and the service is listed without it.
      summary: checkAnswer(s.data.summary, DEFAULT_RULES).ok ? s.data.summary : '',
      url: `/${s.data.pillar}/${s.slug}`,
    }));
}

/** Services that have a live page. The only module that reads the services collection for the agent layer. */
export async function liveServices(): Promise<ServiceSummary[]> {
  return toServiceSummaries(await getCollection('services'));
}
