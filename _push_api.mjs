// Push files to GitHub via the Contents REST API.
// git:// and https git protocol are both unreachable from this machine,
// and the blobs API refuses on a completely empty repo (409).
import { readFileSync, readdirSync } from 'node:fs';

const OWNER = 'f6946672';
const REPO = 'stripinvisible';
const TOKEN = process.env.GH_TOKEN;
const API = 'https://api.github.com';
const ROOT = process.cwd();

const FILES = readdirSync(ROOT).filter(
  (f) => /\.(html|css|js|mjs|json|md)$/.test(f) || f === '.gitignore'
);

const H = {
  Authorization: `token ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'stripinvisible-uploader',
  'Content-Type': 'application/json',
};

async function gh(path, method, body) {
  const r = await fetch(API + path, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(j).slice(0, 250)}`);
  return j;
}

const msg = 'Initial commit: Strip Invisible tool page + build script generating robots.txt and sitemap.xml';

for (const f of FILES) {
  const content = readFileSync(`${ROOT}/${f}`, 'utf8');
  // strip UTF-8 BOM if present
  const clean = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const j = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(f)}`, 'PUT', {
    message: msg,
    content: Buffer.from(clean, 'utf8').toString('base64'),
    branch: 'main',
  });
  console.log(`ok  ${f}  -> commit ${j.commit.sha.slice(0, 7)}`);
}

console.log('DONE files=' + FILES.length);
