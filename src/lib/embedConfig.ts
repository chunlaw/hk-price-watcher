// Mirror of scripts/lib/embed-config.mjs. The client MUST use the same model as
// the precompute step so the query vector lives in the same space as the
// precomputed product vectors.
// all-MiniLM-L6-v2 is small/fast but English-focused; see embed-config.mjs.
export const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const EMBED_DIM = 384;
