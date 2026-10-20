import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toServiceSummaries } from '../src/lib/services-live';

const RETIRED = ['plumbing', 'electrical-fixtures', 'pressure-washing', 'outdoor-living', 'basement-finishing'];

// getCollection() returns nothing under vitest, so the real frontmatter is read from disk
// and fed through the same pure mapping liveServices() uses.
function realEntries() {
  const dir = join(process.cwd(), 'src/content/services');
  const field = (fm: string, key: string) => {
    const m = fm.match(new RegExp(`^${key}: (.+)$`, 'm'));
    return m ? (JSON.parse(m[1]) as string) : '';
  };
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const fm = readFileSync(join(dir, f), 'utf8').split('---')[1];
      return {
        slug: f.replace(/\.md$/, ''),
        data: { title: field(fm, 'title'), pillar: field(fm, 'pillar') as 'repairs' | 'remodeling', summary: field(fm, 'summary') },
      };
    });
}

describe('live services (real content)', () => {
  it('excludes retired services and builds pillar urls', () => {
    const services = toServiceSummaries(realEntries());
    const slugs = services.map((s) => s.slug);
    for (const r of RETIRED) expect(slugs).not.toContain(r);
    expect(services.find((s) => s.slug === 'kitchen-remodeling')?.url).toBe('/remodeling/kitchen-remodeling');
    expect(services.find((s) => s.slug === 'drywall')?.url).toBe('/repairs/drywall');
  });
});

describe('toServiceSummaries', () => {
  const entry = (slug: string, pillar: 'repairs' | 'remodeling') => ({
    slug,
    data: { title: `T ${slug}`, pillar, summary: `S ${slug}` },
  });
  it('filters retired slugs and maps fields', () => {
    const out = toServiceSummaries([entry('plumbing', 'repairs'), entry('drywall', 'repairs'), entry('decks', 'remodeling')]);
    expect(out).toEqual([
      { slug: 'drywall', title: 'T drywall', pillar: 'repairs', summary: 'S drywall', url: '/repairs/drywall' },
      { slug: 'decks', title: 'T decks', pillar: 'remodeling', summary: 'S decks', url: '/remodeling/decks' },
    ]);
  });
});
