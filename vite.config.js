import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Pages and public/ files the app needs offline (the built /assets files are added automatically).
const PUBLIC_PRECACHE = ['index.html', 'iphone.html', 'manifest.webmanifest', 'brand/welcome-couple.jpg', 'brand/alignment-logo.png', 'favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

// Builds src/sw.js into dist/sw.js with the list of files to keep offline and a version that changes with them.
function serviceWorker() {
  return {
    name: 'alignment-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map') && !f.endsWith('.html'));
      const precache = [...new Set(['./', ...built, ...PUBLIC_PRECACHE])].map((f) => (f === './' ? f : `./${f}`));
      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12);
      const source = readFileSync(resolve(import.meta.dirname, 'src/sw.js'), 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// Relative base so the build works from any folder (GitHub Pages, cPanel subfolders, previews).
// Two pages: index.html (the app) and iphone.html (the app inside an iPhone frame, for demos).
export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
  server: { host: true },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        iphone: resolve(import.meta.dirname, 'iphone.html'),
      },
    },
  },
});
