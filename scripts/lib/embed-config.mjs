// Single source of truth for the embedding model, shared by the build script
// (Node) and mirrored by the client (src/lib/embedConfig.ts). If you change the
// model here, change it there too and re-run the data build so the precomputed
// vectors and the client query encoder stay in the same space.

// all-MiniLM-L6-v2: 384-dim sentence embeddings. Small (~23MB quantized) so it
// loads quickly on-device, including on mobile. NOTE: this model is English-
// focused — semantic matching for Traditional Chinese / Thai queries is weak
// (keyword search still covers those). For multilingual semantic search, switch
// back to 'Xenova/paraphrase-multilingual-MiniLM-L12-v2' (also 384-dim, ~120MB).
export const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const EMBED_DIM = 384;
