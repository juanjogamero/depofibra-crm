import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build privado completamente separado del frontend demo GitHub Pages.
// NUNCA copiar el dist antiguo: solo servir dist-secure tras autorización.
export default defineConfig({
  root:'secure',
  plugins:[react()],
  base:'/',
  build:{outDir:'../dist-secure',emptyOutDir:true,sourcemap:false}
});
