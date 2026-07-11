import type { Product, Facets, Meta } from './types';

// All data files are emitted to public/data by scripts/build-data.mjs and served
// as static assets from the same GitHub Pages origin — no runtime API calls.
const base = import.meta.env.BASE_URL;
const url = (p: string) => `${base}data/${p}`.replace(/([^:])\/\//g, '$1/');

export interface LoadedData {
  products: Product[];
  facets: Facets;
  meta: Meta;
}

export async function loadData(): Promise<LoadedData> {
  const [products, facets, meta] = await Promise.all([
    fetch(url('products.json')).then((r) => {
      if (!r.ok) throw new Error(`products.json ${r.status}`);
      return r.json() as Promise<Product[]>;
    }),
    fetch(url('facets.json')).then((r) => r.json() as Promise<Facets>),
    fetch(url('meta.json')).then((r) => r.json() as Promise<Meta>),
  ]);
  return { products, facets, meta };
}

/**
 * Load the precomputed embedding matrix as one big Float32Array. Row i (of
 * length dim) corresponds to products[i]. Returns null if embeddings weren't
 * generated (e.g. an offline/mock build) so the UI can degrade to text search.
 */
export async function loadEmbeddings(meta: Meta): Promise<Float32Array | null> {
  if (!meta.embedding) return null;
  const res = await fetch(url(meta.embedding.file));
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return new Float32Array(buf);
}
