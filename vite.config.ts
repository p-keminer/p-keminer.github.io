import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: [
        resolve(__dirname, 'index.html'),
        resolve(__dirname, '404.html'),
      ],
    },
  },
});
