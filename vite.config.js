import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works from any folder (GitHub Pages, cPanel subfolders, previews).
// Two pages: index.html (the app) and iphone.html (the app inside an iPhone frame, for demos).
export default defineConfig({
  base: './',
  plugins: [react()],
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
