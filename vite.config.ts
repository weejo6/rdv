import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` correspond au chemin GitHub Pages : https://weejo6.github.io/rdv/
export default defineConfig({
  base: '/rdv/',
  plugins: [react()],
});
