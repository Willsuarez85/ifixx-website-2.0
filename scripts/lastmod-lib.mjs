// Real <lastmod> per sitemap URL: the last git commit that touched the files that
// render the page (its page template plus its content entry). A build-time date
// would stamp all pages as changed on every deploy, and Google stops trusting a
// lastmod that always moves. Shared layouts and components are left out on
// purpose: a header tweak is not a content change.
//
// Vercel builds from a shallow clone, where every file older than the fetched
// commits looks like it changed in the oldest one. So a git date is trusted only
// when it comes from a commit inside the fetched history; otherwise the date comes
// from scripts/lastmod-snapshot.json, refreshed with `npm run sitemap:lastmod` on
// a full clone. If neither knows the file, lastmod is omitted, never guessed.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const SNAPSHOT_PATH = 'scripts/lastmod-snapshot.json';

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

const insideRepo = git(['rev-parse', '--is-inside-work-tree']) === 'true';

function shallowBoundary() {
  if (!insideRepo) return new Set();
  const file = git(['rev-parse', '--git-path', 'shallow']);
  if (!file || !existsSync(file)) return new Set();
  return new Set(readFileSync(file, 'utf8').split('\n').filter(Boolean));
}

const boundary = shallowBoundary();

// Date of the last commit that touched `file`, or '' when git cannot know it.
export function gitDate(file) {
  if (!insideRepo) return '';
  const out = git(['log', '-1', '--format=%H %cI', '--', file]);
  if (!out) return '';
  const [sha, date] = out.split(' ');
  if (boundary.has(sha)) return '';
  return new Date(date).toISOString();
}

function loadSnapshot() {
  try {
    return JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
  } catch {
    return {};
  }
}

const snapshot = loadSnapshot();

export function fileDate(file) {
  return gitDate(file) || snapshot[file] || '';
}

export function sourcesFor(pathname) {
  const p = pathname.replace(/\/$/, '') || '/';
  if (p === '/') return ['src/pages/index.astro'];
  const dynamic = [
    [/^\/blog\/([a-z0-9-]+)$/, 'src/pages/blog/[slug].astro', 'src/content/posts'],
    [/^\/repairs\/([a-z0-9-]+)$/, 'src/pages/repairs/[serviceSlug].astro', 'src/content/services'],
    [/^\/remodeling\/([a-z0-9-]+)$/, 'src/pages/remodeling/[serviceSlug].astro', 'src/content/services'],
    [/^\/service-areas\/([a-z0-9-]+)$/, 'src/pages/service-areas/[locationSlug].astro', 'src/content/cities'],
  ];
  for (const [re, template, dir] of dynamic) {
    const m = p.match(re);
    if (m) return [template, `${dir}/${m[1]}.md`, `${dir}/${m[1]}.mdx`];
  }
  return [`src/pages${p}.astro`, `src/pages${p}/index.astro`];
}

// Latest date among the page's sources; undefined when none is known.
export function lastmodFor(url) {
  const dates = sourcesFor(new URL(url).pathname)
    .filter((f) => existsSync(f))
    .map(fileDate)
    .filter(Boolean)
    .sort();
  return dates.length ? dates[dates.length - 1] : undefined;
}

// Every file a sitemap URL can depend on, for the snapshot.
export function trackedSources() {
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  return ['src/pages', 'src/content']
    .filter((d) => existsSync(d))
    .flatMap(walk)
    .filter((f) => /\.(astro|md|mdx)$/.test(f))
    .sort();
}
