// Checks the internal `href="…"` links of the built site against the redirect table.
//
// WHAT IT COVERS: root-relative href attributes in dist/client/**/*.html, and every
// literal (non-wildcard) rule in vercel.json.
// WHAT IT DOES NOT COVER, so nobody mistakes a clean run for a full audit: absolute
// URLs (so <link rel="canonical"> and JSON-LD `url`/`item` are never checked), og/twitter
// `content=` attributes, srcset, wildcard rules like /mint-hill/:rest*, the `rewrites`
// table, dist/server, .vercel/output, the sitemaps, and src/content markdown.
//
// Failure modes it does catch, all of which this repo has shipped before:
//   SHADOWED — a built page that is also a redirect source. Vercel resolves redirects
//              before the filesystem, so the page is unreachable behind its own rule.
//              This is checked FIRST, in Vercel's order, not the filesystem's.
//   BROKEN   — a link to a URL that is neither a page nor a redirect (hard 404)
//   CHAIN    — a redirect whose destination is itself a redirect (double hop)
//   DEAD301  — a redirect whose destination is not a built page at all
//   HOP      — an internal link that lands on a redirect instead of the final page
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'dist/client';

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const files = walk(ROOT);
const pages = new Set(
  files
    .filter((f) => f.endsWith('/index.html'))
    .map((f) => f.slice(ROOT.length).replace(/\/index\.html$/, '') || '/')
);

const norm = (u) => (u.length > 1 ? u.replace(/\/+$/, '') : u);
const redirects = new Map();
const wildcards = [];
for (const r of JSON.parse(readFileSync('vercel.json', 'utf8')).redirects) {
  if (r.source.includes(':') || r.source.includes('*')) {
    wildcards.push(r.source);
    continue;
  }
  redirects.set(norm(r.source), norm(r.destination));
}

const problems = [];
const linkCount = new Map();

// Vercel order: a redirect wins over a built page. Any URL that is both is unreachable.
for (const [source] of redirects) {
  if (pages.has(source)) problems.push(['SHADOWED', '(vercel.json)', `${source} -> ${redirects.get(source)}`]);
}

for (const file of files.filter((f) => f.endsWith('.html'))) {
  const from = file.slice(ROOT.length).replace(/\/index\.html$/, '') || '/';
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const raw = m[1];
    if (/^(https?:|mailto:|tel:|#|javascript:)/.test(raw)) continue;
    if (!raw.startsWith('/')) continue;
    const url = norm(raw.split(/[?#]/)[0]);
    if (/\.[a-z0-9]{2,5}$/i.test(url)) {
      if (!existsSync(join(ROOT, url))) problems.push(['BROKEN-ASSET', from, url]);
      continue;
    }
    linkCount.set(url, (linkCount.get(url) || 0) + 1);
    // Redirects first, matching how Vercel resolves. A page that is also a redirect
    // source is already reported as SHADOWED above; here the link still lands on the 301.
    if (redirects.has(url)) {
      const dest = redirects.get(url);
      if (redirects.has(dest)) problems.push(['CHAIN', from, `${url} -> ${dest} -> ${redirects.get(dest)}`]);
      else if (!pages.has(dest)) problems.push(['DEAD301', from, `${url} -> ${dest}`]);
      else problems.push(['HOP', from, `${url} -> ${dest}`]);
      continue;
    }
    if (pages.has(url)) continue;
    problems.push(['BROKEN', from, url]);
  }
}

// Every redirect destination must be a real page, whether or not anything links to it.
for (const [source, dest] of redirects) {
  if (redirects.has(dest)) problems.push(['CHAIN-TABLE', '(vercel.json)', `${source} -> ${dest}`]);
  else if (!pages.has(dest)) problems.push(['DEAD301-TABLE', '(vercel.json)', `${source} -> ${dest}`]);
}

const byKind = new Map();
for (const [kind, from, url] of problems) {
  if (!byKind.has(kind)) byKind.set(kind, []);
  byKind.get(kind).push(`${url}   [en ${from}]`);
}

console.log(`páginas construidas: ${pages.size}`);
console.log(`redirects literales: ${redirects.size} (+ ${wildcards.length} con comodín, NO comprobados: ${wildcards.join(', ')})`);
console.log(`URLs internas distintas enlazadas: ${linkCount.size}`);

const KINDS = ['SHADOWED', 'BROKEN', 'BROKEN-ASSET', 'CHAIN', 'CHAIN-TABLE', 'DEAD301', 'DEAD301-TABLE', 'HOP'];
let failures = 0;
for (const kind of KINDS) {
  const list = byKind.get(kind) || [];
  failures += list.length;
  console.log(`\n${kind}: ${list.length}`);
  for (const l of [...new Set(list)].slice(0, 25)) console.log('  ' + l);
}

if (failures > 0) {
  console.error(`\n${failures} problemas. verify:links FALLA.`);
  process.exit(1);
}
console.log('\nSin problemas en las categorías cubiertas.');
