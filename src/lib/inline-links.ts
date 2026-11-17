/**
 * Inline links inside frontmatter copy (FAQ answers, "what's included" bullets).
 *
 * Frontmatter strings are plain text, so a link is written the markdown way,
 * `[label](/path)`, and only root-relative paths are recognised. Two readers:
 *   - the page, which renders the label as an anchor (renderInlineLinks)
 *   - JSON-LD and anything else that needs clean text (stripInlineLinks)
 * The visible answer and the schema answer stay the same sentence either way.
 */
const INLINE_LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const INLINE_LINK_CLASS = 'text-primary-600 hover:text-primary-700 underline underline-offset-4';

/** Plain text: every `[label](/path)` collapses to its label. */
export const stripInlineLinks = (text: string): string => text.replace(INLINE_LINK, '$1');

/** Escaped HTML for `set:html`, with every `[label](/path)` turned into an anchor. */
export const renderInlineLinks = (text: string, linkClass: string = INLINE_LINK_CLASS): string => {
  let html = '';
  let last = 0;
  for (const match of text.matchAll(INLINE_LINK)) {
    const [whole, label, href] = match;
    const start = match.index ?? 0;
    html += escapeHtml(text.slice(last, start));
    html += `<a href="${escapeHtml(href)}" class="${escapeHtml(linkClass)}">${escapeHtml(label)}</a>`;
    last = start + whole.length;
  }
  return html + escapeHtml(text.slice(last));
};
