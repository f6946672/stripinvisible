import { mkdirSync, copyFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
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
