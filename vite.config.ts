import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site is served from https://<user>.github.io/<repo>/ on GitHub Pages.
// `BASE_PATH` is provided by the Pages workflow; locally it defaults to '/'.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2020',
    // The precomputed embedding vectors live in public/data and are fetched at
    // runtime, so nothing here needs special chunking beyond vendor splitting.
    chunkSizeWarningLimit: 1500,
  },
  // Transformers.js pulls in onnxruntime-web; keep it out of the dep pre-bundle
  // so its wasm assets resolve correctly.
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
  },
});
