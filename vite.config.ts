import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: !process.env.VITE_NO_OPEN },
  // The repo root also holds the design source (mockup/, docs/, capsule/, badge/).
  // Only ./index.html and ./src are part of the app.
  build: { outDir: 'dist', emptyOutDir: true },
});
