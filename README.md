# Strip Invisible

Strip invisible Unicode characters out of AI-generated text — zero-width spaces,
word joiners, tag characters, private-use marks, soft hyphens and BOMs.

Runs entirely in the browser. No backend, no upload, no sign-up.
Page-level analytics only (Cloudflare Web Analytics beacon, cookieless).

Live: <https://stripinvisible.com>

## Build

```
npm run build
```

Outputs to `dist/` and generates `robots.txt` and `sitemap.xml`. Any `.html`
file placed at the repo root is picked up automatically on the next build and
added to the sitemap.

## Deploy

Hosted on Cloudflare Pages (project `stripinvisible`, direct upload — this
Cloudflare account has no GitHub App installed, so Pages does not build from the
repo). From this repo root:

```
npm run build
npx wrangler pages deploy dist --project-name stripinvisible --branch main
```

Needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the environment.
`.github/workflows/deploy.yml` does the same thing on every push to `main`,
provided the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
are set.

## What it does not do

It does not rewrite wording, so it does not touch the statistical watermark
carried by word choice. The page says so plainly and shows no removal score.
