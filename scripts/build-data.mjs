// Build the site's data bundle. Runs in GitHub Actions (and locally):
//
//   1. fetch the raw Consumer Council feed (or a local mock),
//   2. digest each product + its offers into structured unit prices,
//   3. build the category / supermarket facets,
//   4. precompute a semantic-search embedding per product,
//   5. write everything to public/data/.
//
// No server and no paid API: the feed is free open data and embeddings are
// computed locally with Transformers.js (ONNX on CPU).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { digestProduct, embeddingText, buildFacets } from './lib/digest.mjs';
import { EMBED_MODEL, EMBED_DIM } from './lib/embed-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'data');

const API_URL = 'https://online-price-watch.consumer.org.hk/opw/opendata/pricewatch.json';
const MOCK_PATH = join(ROOT, 'data', 'pricewatch.mock.json');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
};
const flag = (name) => args.includes(`--${name}`);

const source = opt('source', 'api');
const noEmbeddings = flag('no-embeddings');
const limit = parseInt(opt('limit', '0'), 10) || 0;

async function fetchWithRetry(url, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'hk-price-watcher/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      const wait = 2000 * 2 ** i;
      console.warn(`fetch attempt ${i + 1} failed (${err.message}); retrying in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

async function loadRaw() {
  const file = opt('file', '');
  if (file) {
    console.log('Loading data from file', file);
    return JSON.parse(readFileSync(file, 'utf8'));
  }
  if (source === 'mock') {
    console.log('Loading mock data from', MOCK_PATH);
    return JSON.parse(readFileSync(MOCK_PATH, 'utf8'));
  }
  console.log('Fetching live data from', API_URL);
  const data = await fetchWithRetry(API_URL);
  // The feed is a bare array; some mirrors wrap it under a key.
  return Array.isArray(data) ? data : (data.products || data.data || data.records || []);
}

async function main() {
  const raw = await loadRaw();
  console.log(`Loaded ${raw.length} raw records`);

  let products = raw.map(digestProduct).filter(Boolean);
  if (limit) products = products.slice(0, limit);
  console.log(`Digested ${products.length} products`);

  const parsedOfferCount = products.reduce(
    (acc, p) => acc + p.offers.filter((o) => o.offerParsed).length,
    0,
  );
  const withOfferText = products.reduce(
    (acc, p) => acc + p.offers.filter((o) => o.hasOffer).length,
    0,
  );
  console.log(`Offers with text: ${withOfferText}, of which parsed to a unit price: ${parsedOfferCount}`);

  const facets = buildFacets(products);

  mkdirSync(OUT_DIR, { recursive: true });

  // Embeddings (optional; skipped for fast offline/mock builds).
  let embeddingsWritten = false;
  if (!noEmbeddings) {
    try {
      const { embedAll } = await import('./lib/embed.mjs');
      const texts = products.map(embeddingText);
      console.log(`Embedding ${texts.length} products with ${EMBED_MODEL} ...`);
      const vectors = await embedAll(texts, (done, total) => {
        if (done % 512 === 0 || done === total) console.log(`  embedded ${done}/${total}`);
      });
      writeFileSync(join(OUT_DIR, 'embeddings.bin'), Buffer.from(vectors.buffer));
      embeddingsWritten = true;
      console.log('Wrote embeddings.bin');
    } catch (err) {
      console.warn('Embedding step skipped/failed:', err.message);
      console.warn('The site will still work with instant text search; semantic search will be disabled.');
    }
  } else {
    console.log('Skipping embeddings (--no-embeddings)');
  }

  // Strip nothing — products.json carries everything the UI needs. The order of
  // products.json matches the row order in embeddings.bin.
  writeFileSync(join(OUT_DIR, 'products.json'), JSON.stringify(products));
  writeFileSync(join(OUT_DIR, 'facets.json'), JSON.stringify(facets));

  const meta = {
    source: source === 'mock' ? 'mock' : 'consumer-council-online-price-watch',
    apiUrl: API_URL,
    // Timestamp is injected by the workflow (BUILD_TIME) to keep script output
    // deterministic; falls back to null locally.
    generatedAt: process.env.BUILD_TIME || null,
    productCount: products.length,
    supermarketCount: facets.supermarkets.length,
    categoryCount: facets.categories.length,
    offersWithText: withOfferText,
    offersParsed: parsedOfferCount,
    embedding: embeddingsWritten
      ? { model: EMBED_MODEL, dim: EMBED_DIM, count: products.length, file: 'embeddings.bin' }
      : null,
  };
  writeFileSync(join(OUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2));

  console.log('Done. Wrote products.json, facets.json, meta.json' + (embeddingsWritten ? ', embeddings.bin' : ''));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
