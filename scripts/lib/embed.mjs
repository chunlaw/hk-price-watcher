// Node-side embedding, used only inside GitHub Actions to precompute product
// vectors. Uses Transformers.js (ONNX, runs locally on the CI runner's CPU) so
// there is no paid API call. The SAME model + pooling is used on the client to
// embed the user's query, which is what makes cosine similarity meaningful.

import { EMBED_MODEL, EMBED_DIM } from './embed-config.mjs';

let _extractor = null;

async function getExtractor() {
  if (_extractor) return _extractor;
  const { pipeline, env } = await import('@xenova/transformers');
  // Cache downloaded model weights in the workspace so repeated CI steps reuse them.
  env.cacheDir = process.env.TRANSFORMERS_CACHE || './.cache/transformers';
  _extractor = await pipeline('feature-extraction', EMBED_MODEL, { quantized: true });
  return _extractor;
}

/**
 * Embed an array of strings into normalized vectors.
 * @param {string[]} texts
 * @param {(done:number,total:number)=>void} [onProgress]
 * @returns {Promise<Float32Array>} flat array of texts.length * EMBED_DIM
 */
export async function embedAll(texts, onProgress) {
  const extractor = await getExtractor();
  const out = new Float32Array(texts.length * EMBED_DIM);
  const BATCH = 32;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await extractor(batch, { pooling: 'mean', normalize: true });
    // res.data is a flat Float32Array of batch.length * EMBED_DIM
    out.set(res.data, i * EMBED_DIM);
    if (onProgress) onProgress(Math.min(i + BATCH, texts.length), texts.length);
  }
  return out;
}
