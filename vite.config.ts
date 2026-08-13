import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5174,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Explicitly declare HTML entry points that aren't referenced from
      // manifest.config.ts. The popup is auto-discovered via
      // action.default_popup; the onboarding welcome page is opened
      // programmatically from the SW so CRXJS won't find it. Absolute
      // path avoids conflicts with CRXJS's own input resolution.
      input: {
        welcome: resolve(__dirname, 'src/onboarding/welcome.html'),
      },
      output: {
        chunkFileNames: 'assets/chunk-[hash].js',
      },
    },
  },
});
