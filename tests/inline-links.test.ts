import { describe, expect, it } from 'vitest';
import { renderInlineLinks, stripInlineLinks } from '../src/lib/inline-links';
import { serviceNode, webPageNode } from '../src/lib/schema-graph';

describe('inline links in frontmatter copy', () => {
  const answer = 'Yes. [Tub-to-shower conversions](/blog/tub-to-shower-conversion-charlotte) are popular.';

  it('strips a link down to its label', () => {
    expect(stripInlineLinks(answer)).toBe('Yes. Tub-to-shower conversions are popular.');
  });

  it('renders a link as an anchor and escapes the rest', () => {
    const html = renderInlineLinks('Fast & clean: [see <it>](/gallery)', 'x');
    expect(html).toBe('Fast &amp; clean: <a href="/gallery" class="x">see &lt;it&gt;</a>');
  });

  it('leaves text without links untouched', () => {
    expect(stripInlineLinks('Most rooms take 1-2 days.')).toBe('Most rooms take 1-2 days.');
    expect(renderInlineLinks('Most rooms take 1-2 days.')).toBe('Most rooms take 1-2 days.');
  });

  it('ignores external or malformed targets', () => {
    const text = 'See [this](https://example.com) and [that](gallery).';
    expect(stripInlineLinks(text)).toBe(text);
    expect(renderInlineLinks(text)).not.toContain('<a ');
  });

  it('keeps markdown out of the FAQ schema', () => {
    const node = webPageNode({ path: '/x', name: 'X', description: 'd', faqs: [{ q: 'Q?', a: answer }] });
    expect(JSON.stringify(node)).not.toContain('](');
    expect((node as any).mainEntity[0].acceptedAnswer.text).toBe('Yes. Tub-to-shower conversions are popular.');
  });

  it('keeps markdown out of the service catalog schema', () => {
    const node = serviceNode({
      path: '/x',
      name: 'X',
      serviceType: 'X',
      description: 'd',
      catalog: ['[Countertop replacement](/blog/best) (granite, quartz, marble)'],
    } as any);
    expect(JSON.stringify(node)).not.toContain('](');
    expect(JSON.stringify(node)).toContain('Countertop replacement (granite, quartz, marble)');
  });
});
