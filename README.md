# HK Price Watcher · 香港格價

A fast, bilingual (Traditional Chinese / English) website for comparing Hong
Kong supermarket prices and promotions, with **on-device semantic search**.

Data comes from the Consumer Council's
[Online Price Watch open data](https://data.gov.hk/en-data/dataset/cc-pricewatch-pricewatch)
([`pricewatch.json`](https://online-price-watch.consumer.org.hk/opw/opendata/pricewatch.json)),
refreshed **daily** by GitHub Actions. The site is 100% static and hosted on
GitHub Pages — **no server, and no paid API calls**.

## Features

- **Bilingual UI** — Traditional Chinese and English (no Simplified Chinese),
  switchable at any time; remembers your choice.
- **Semantic search, on-device** — product vectors are precomputed in CI; your
  query is embedded **in your browser** with [Transformers.js](https://github.com/xenova/transformers.js)
  and ranked by cosine similarity. The query never leaves your device and no API
  is called. A fast keyword filter is always on; semantic ("Smart search") is an
  opt-in toggle that lazy-loads a small multilingual model once and caches it.
- **Category browsing** — the feed's 3-level category tree (with live counts),
  plus supermarket and "on offer only" filters.
- **Digested offers** — free-text promotions ("Buy 2 to save $4.00",
  "第二件半價", "Add 3 to cart get 1 free", …) are parsed **in GitHub Actions**
  into structured numbers. For every product/store the site shows the regular
  **unit price**, the **effective discounted unit price**, and the **minimum
  consumption** (min. quantity or spend) required. ~99% of offers with text are
  parsed; the raw text is always shown too.
- **Sorting** by relevance, lowest price, or lowest effective unit price.

## Tech stack

Vite · React · TypeScript · MUI (Material UI) · Transformers.js.

## How it works

```
GitHub Actions (daily)                          Browser (static site)
─────────────────────                           ─────────────────────
fetch pricewatch.json ─┐
digest offers ─────────┼─▶ public/data/products.json ─▶ instant keyword filter
build facet tree ──────┘   public/data/facets.json   ─▶ category / store filters
embed each product ──────▶ public/data/embeddings.bin ─▶ cosine rank vs. on-device
  (Transformers.js, CPU)                                  query embedding
```

The embedding model (`Xenova/paraphrase-multilingual-MiniLM-L12-v2`, 384-dim) is
declared once in `scripts/lib/embed-config.mjs` and mirrored in
`src/lib/embedConfig.ts`. The **same** model is used to precompute product
vectors (CI) and to embed the query (browser), so the two live in the same space.

## Project layout

```
scripts/
  build-data.mjs        orchestrates fetch → digest → embed → write
  gen-mock.mjs          generates offline mock data (real feed shape)
  lib/offers.mjs        free-text promotion parser  ← the offer "digestion"
  lib/digest.mjs        raw record → digested product + facet builder
  lib/embed.mjs         Node-side embedding (Transformers.js)
  lib/supermarkets.mjs  supermarket code → bilingual name
src/
  pages/HomePage.tsx    search + filter + results orchestration
  hooks/useSemantic.ts  lazy model load + on-device query ranking
  lib/semantic.ts       browser embedding + cosine similarity
  components/           SearchBar, FiltersPanel, CategoryTree, ProductCard, ProductDialog
  i18n/                 bilingual strings + language context
.github/workflows/
  deploy.yml            daily data refresh + Pages deploy
  ci.yml                PR build check (mock data)
```

## Local development

```bash
npm install                 # if `sharp` fails to fetch a binary behind a proxy,
                            # use: npm install --ignore-scripts
npm run data:mock           # generate offline mock data
npm run data:build:mock     # digest it into public/data (no embeddings)
npm run dev                 # http://localhost:5173
```

To build against a real feed snapshot with embeddings (needs network to download
the model once):

```bash
npm run data:build          # fetches the live feed + computes embeddings
npm run build && npm run preview
```

## Deploying to GitHub Pages

The site is served from the custom domain **https://hk-price-watcher.chunlaw.io**.

1. Push to the default branch (`main`).
2. In **Settings → Pages**, set **Source: GitHub Actions**, and set the
   **Custom domain** to `hk-price-watcher.chunlaw.io` (the `public/CNAME` file
   already pins this). Enable **Enforce HTTPS** once the certificate is issued.
3. DNS: a `CNAME` record for `hk-price-watcher` → `chunlaw.github.io`.
4. The `deploy` workflow builds the data and publishes the site. It re-runs
   daily (20:00 UTC) and can be triggered manually from the **Actions** tab.
   The site is built with `BASE_PATH=/` because the custom domain serves from the
   root. (Without a custom domain, set `BASE_PATH=/hk-price-watcher/`.)

## Data & disclaimer

Data © Consumer Council, provided as open data via DATA.GOV.HK. Effective unit
prices are computed heuristically from promotion text and may not capture every
term or condition — always verify in-store.
