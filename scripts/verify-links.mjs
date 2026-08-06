// Verifies every internal link in the build resolves, in one hop, to a page that exists.
// Three failure modes it is looking for, all of which this repo has shipped before:
//   BROKEN  — link to a URL that is neither a page nor a redirect (hard 404)
//   CHAIN   — a redirect whose destination is itself a redirect (double hop)
//   DEAD301 — a redirect whose destination is not a built page at all
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

// Redirect table, normalised without trailing slash.
const norm = (u) => (u.length > 1 ? u.replace(/\/+$/, '') : u);
const redirects = new Map();
for (const r of JSON.parse(readFileSync('vercel.json', 'utf8')).redirects) {
  if (r.source.includes(':')) continue; // host catch-all and /mint-hill/:rest*
  redirects.set(norm(r.source), norm(r.destination));
}

const problems = [];
const linkCount = new Map();

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
    if (pages.has(url)) continue;
    if (redirects.has(url)) {
      const dest = redirects.get(url);
      if (redirects.has(dest)) problems.push(['CHAIN', from, `${url} -> ${dest} -> ${redirects.get(dest)}`]);
      else if (!pages.has(dest)) problems.push(['DEAD301', from, `${url} -> ${dest}`]);
      else problems.push(['HOP', from, `${url} -> ${dest}`]);
      continue;
    }
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
console.log(`redirects (sin comodines): ${redirects.size}`);
console.log(`URLs internas distintas enlazadas: ${linkCount.size}`);
for (const kind of ['BROKEN', 'BROKEN-ASSET', 'CHAIN', 'CHAIN-TABLE', 'DEAD301', 'DEAD301-TABLE', 'HOP']) {
  const list = byKind.get(kind) || [];
  console.log(`\n${kind}: ${list.length}`);
  for (const l of [...new Set(list)].slice(0, 25)) console.log('  ' + l);
}
