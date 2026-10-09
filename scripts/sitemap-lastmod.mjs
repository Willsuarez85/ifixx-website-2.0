// Refreshes scripts/lastmod-snapshot.json: the last commit date of every page
// template and content entry, read from full git history. The sitemap falls back
// to it when the build runs on a shallow clone (Vercel). Run on a full clone:
//   npm run sitemap:lastmod
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { SNAPSHOT_PATH, gitDate, trackedSources } from './lastmod-lib.mjs';

const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim();
if (shallow === 'true') {
  console.error('Shallow clone: run `git fetch --unshallow` first.');
  process.exit(1);
}

const snapshot = {};
for (const file of trackedSources()) {
  const date = gitDate(file);
  if (date) snapshot[file] = date;
}
writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`${Object.keys(snapshot).length} files dated in ${SNAPSHOT_PATH}`);
