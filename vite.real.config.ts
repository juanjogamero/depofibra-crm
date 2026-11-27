import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Compilar la interfaz ORIGINAL exclusivamente para el dominio privado.
// Nunca publicar este resultado en GitHub Pages ni sustituir la web pública.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { outDir: 'dist-real', sourcemap: false }
});
