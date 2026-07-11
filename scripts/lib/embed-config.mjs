// Single source of truth for the embedding model, shared by the build script
// (Node) and mirrored by the client (src/lib/embedConfig.ts). If you change the
// model here, change it there too and re-run the data build so the precomputed
// vectors and the client query encoder stay in the same space.

// Multilingual MiniLM: 384-dim sentence embeddings covering English + Chinese,
// small enough to download once and cache on-device in the browser.
export const EMBED_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
export const EMBED_DIM = 384;
