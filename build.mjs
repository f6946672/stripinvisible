import { mkdirSync, copyFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://stripinvisible.com';
const OUT = 'dist';
const ASSETS = ['index.html', 'styles.css', 'script.js'];

mkdirSync(OUT, { recursive: true });

for (const f of ASSETS) {
  copyFileSync(f, join(OUT, f));
}

// Every .html in dist becomes a sitemap entry. Drop a new .html in and it
// shows up on the next build without touching this file.
const pages = readdirSync(OUT)
  .filter((f) => f.endsWith('.html'))
  .map((f) => (f === 'index.html' ? '/' : '/' + f))
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
