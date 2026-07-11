// Client-side semantic search. The user's query is embedded ON THE DEVICE with
// Transformers.js (WASM/WebGPU) — the query text never leaves the browser and
// there is no API call. Product vectors were precomputed in GitHub Actions with
// the identical model, so a plain dot product over normalized vectors gives
// cosine similarity.

import { EMBED_MODEL, EMBED_DIM } from './embedConfig';

type FeatureExtractor = (
  text: string | string[],
  opts: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array }>;

let extractorPromise: Promise<FeatureExtractor> | null = null;

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Lazily load the embedding model. Safe to call repeatedly; the download+init
 * happens once and is cached by the browser (IndexedDB) for subsequent visits.
 */
export function loadModel(onProgress?: (p: number) => void): Promise<FeatureExtractor> {
  if (extractorPromise) return extractorPromise;
  extractorPromise = (async () => {
    const { pipeline, env } = await import('@xenova/transformers');
    // Runtime-only model download from the Hugging Face CDN (free, cached
    // in-browser). No bundling, no server.
    env.allowLocalModels = false;
    const pipe = await pipeline('feature-extraction', EMBED_MODEL, {
      quantized: true,
      progress_callback: (info: { status?: string; progress?: number }) => {
        if (onProgress && typeof info.progress === 'number') onProgress(info.progress / 100);
      },
    });
    return pipe as unknown as FeatureExtractor;
  })();
  return extractorPromise;
}

/** Embed a single query string into a normalized Float32Array of length EMBED_DIM. */
export async function embedQuery(text: string): Promise<Float32Array> {
  const extractor = await loadModel();
  const res = await extractor(text, { pooling: 'mean', normalize: true });
  return res.data;
}

/**
 * Rank product rows by cosine similarity to the query vector.
 * @param query normalized query vector (length EMBED_DIM)
 * @param matrix flat product matrix (rows * EMBED_DIM), each row normalized
 * @param rows number of product rows
 * @returns array of { index, score } sorted by score desc
 */
export function rankBySimilarity(
  query: Float32Array,
  matrix: Float32Array,
  rows: number,
): { index: number; score: number }[] {
  const scores: { index: number; score: number }[] = new Array(rows);
  for (let i = 0; i < rows; i++) {
    let dot = 0;
    const off = i * EMBED_DIM;
    for (let d = 0; d < EMBED_DIM; d++) dot += query[d] * matrix[off + d];
    scores[i] = { index: i, score: dot };
  }
  scores.sort((a, b) => b.score - a.score);
  return scores;
}
