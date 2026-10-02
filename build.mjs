import { mkdirSync, copyFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://stripinvisible.com';
const OUT = 'dist';

// Anything in the repo root that is not listed here is treated as a site asset
// and copied as-is. Drop a new .html at the root and it ships on the next build.
const EXCLUDE = new Set([
  'build.mjs',
  'package.json',
  'package-lock.json',
  'README.md',
  '.gitignore',
  // local audit scripts that live in the repo root; without this they get
  // copied into dist and published. `_redirects` must NOT be excluded.
  '_inv.py',
  'dist',
  'node_modules',
  '.git',
  '.github',
  '.wrangler',
]);

mkdirSync(OUT, { recursive: true });

const assets = readdirSync('.').filter((f) => {
  if (f.startsWith('.') || EXCLUDE.has(f)) return false;
  return statSync(f).isFile();
});

for (const f of assets) copyFileSync(f, join(OUT, f));

// dist is never cleaned by anything else, so a file deleted from the repo root
// would otherwise linger here — and since the sitemap is built from dist, a
// deleted page would keep its sitemap entry and get re-published. Prune it.
const generated = new Set(['robots.txt', 'sitemap.xml']);
const expected = new Set([...assets, ...generated]);
for (const f of readdirSync(OUT)) {
  if (!expected.has(f)) {
    unlinkSync(join(OUT, f));
    console.log(`pruned stale ${f}`);
  }
}

// Every .html in dist becomes a sitemap entry. 404 is a page too, just not one
// anyone should be indexing.
const pages = readdirSync(OUT)
  .filter((f) => f.endsWith('.html') && f !== '404.html')
  // Pages serves /about.html at /about and 308s the .html form, so the
  // extensionless path is the canonical one and belongs in the sitemap.
  .map((f) => (f === 'index.html' ? '/' : '/' + f.replace(/\.html$/, '')))
  .sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));

const lastmod = new Date().toISOString().slice(0, 10);

writeFileSync(
  join(OUT, 'robots.txt'),
  `User-agent: *
Allow: /
Sitemap: ${SITE}/sitemap.xml
`
);

const urlset = pages
  .map(
    (p) => `  <url>
    <loc>${p === '/' ? SITE + '/' : SITE + p}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`
  )
  .join('\n');

writeFileSync(
  join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>
`
);

console.log(`built ${pages.length} page(s) -> ${OUT}  (lastmod ${lastmod})`);
for (const p of pages) console.log('  ' + p);
console.log(`copied ${assets.length} asset(s): ${assets.join(', ')}`);
