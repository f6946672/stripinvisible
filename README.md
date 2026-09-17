# Strip Invisible

Strip invisible Unicode characters out of AI-generated text — zero-width spaces,
word joiners, tag characters, private-use marks, soft hyphens and BOMs.

Runs entirely in the browser. No backend, no upload, no sign-up, no analytics
scripts. Everything happens in the page.

## Build

```
npm run build
```

Outputs to `dist/` and generates `robots.txt` and `sitemap.xml`. Any `.html`
file placed at the repo root is picked up automatically on the next build and
added to the sitemap.

## Deploy

Static hosting only. Build command `node build.mjs`, output directory `dist`.

## What it does not do

It does not rewrite wording, so it does not touch the statistical watermark
carried by word choice. The page says so plainly and shows no removal score.
