import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // La demo GitHub Pages mantiene la subruta anterior. El VPS genera /.
  base: process.env.VITE_BASE_PATH || '/depofibra-crm/',
  build: { outDir: 'dist', sourcemap: false },
});