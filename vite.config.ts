import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/depofibra-crm/',
  build: { outDir: 'dist', sourcemap: false },
});