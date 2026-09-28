import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works from any folder (GitHub Pages, previews, etc.)
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true },
});
