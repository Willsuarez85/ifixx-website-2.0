import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toServiceSummaries } from '../src/lib/services-live';
import { renderLlmsTxt } from '../src/lib/agent-facts';

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

describe('summaries pass the guardrail', () => {
  const fixture = (slug: string, summary: string) => ({ slug, data: { title: `T ${slug}`, pillar: 'repairs' as const, summary } });

  it('publishes a service with an empty summary when the summary breaks a rule', () => {
    const [out] = toServiceSummaries([fixture('doors-windows', 'Insured South Charlotte handyman, same-week install.')]);
    expect(out.slug).toBe('doors-windows');
    expect(out.summary).toBe('');
  });

  it('keeps a clean summary', () => {
    const [out] = toServiceSummaries([fixture('painting', 'Interior and exterior painting.')]);
    expect(out.summary).toBe('Interior and exterior painting.');
  });

  it('blanks the real doors-windows summary and keeps every service listed', () => {
    const real = realEntries();
    const out = toServiceSummaries(real);
    expect(out.find((s) => s.slug === 'doors-windows')?.summary).toBe('');
    expect(out.length).toBe(real.filter((e) => !RETIRED.includes(e.slug)).length);
  });

  it('renders an empty summary as a bare link, no trailing colon', () => {
    const txt = renderLlmsTxt([
      { slug: 'doors-windows', title: 'Doors & Windows', pillar: 'repairs', summary: '', url: '/repairs/doors-windows' },
    ]);
    expect(txt).toContain('- [Doors & Windows](https://www.ifixxnc.com/repairs/doors-windows)\n');
    expect(txt).not.toContain('/repairs/doors-windows):');
  });
});
