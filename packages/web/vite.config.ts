import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:3000';
// Static files (favicon, the vendored tailor CSS, palettes, skins and icon sprite) live in the repo root.
const publicDir = new URL('../../public/', import.meta.url);

/**
 * Puts the vendored tailor head snippet (core CSS links, pre-paint skin/palette/mode script,
 * window.TAILOR_CONFIG) at the marker in index.html, so `tailor sync` updates reach the page
 * without a hand-copy.
 */
function tailorHead(): Plugin {
  const marker = /<!-- tailor-head:[^>]*-->/;
  return {
    name: 'tailor-head',
    transformIndexHtml(html) {
      const snippet = readFileSync(new URL('tailor/tailor-head.html', publicDir), 'utf8');
      if (!marker.test(html)) throw new Error('index.html: tailor-head marker missing');
      return html.replace(marker, () => snippet.trim());
    },
  };
}

export default defineConfig({
  plugins: [tailorHead(), react()],
  publicDir: publicDir.pathname,
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
  server: {
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/auth': { target: apiTarget, changeOrigin: true },
      '/health': { target: apiTarget, changeOrigin: true },
    },
  },
});
