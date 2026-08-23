# owenmedeiros.com

Personal site of Owen Medeiros — research, publications, and technical projects.

Built with [Astro](https://astro.build), deployed to [Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/) as static assets at [owenmedeiros.com](https://owenmedeiros.com).

## Development

```bash
npm install
npm run dev       # local dev server at localhost:4321
npm run build     # build to dist/
npm run preview   # preview production build
```

## Deployment

Pushes to `main` trigger a Cloudflare Workers Build (`npm run build`), and wrangler serves `dist/` on the custom domain `owenmedeiros.com` (config in `wrangler.jsonc`).

Manual deploy:

```bash
npm run build
npx wrangler deploy
```

## Layout

- `src/pages/` — site pages (markdown + Astro)
- `src/layouts/` — `Base.astro` (shell + all CSS), `Md.astro` (markdown wrapper)
- `public/` — images, PDFs, and downloadable files
- `references.bib`, `scripts/` — bibliography sources for the publications list
- `docs/habits-pipeline.md` — how `/habits` collects its data, and what is fragile about it
