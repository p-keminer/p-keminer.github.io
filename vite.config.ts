import { defineConfig } from 'vite';
import { resolve } from 'path';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: [
        resolve(__dirname, 'index.html'),
        resolve(__dirname, '404.html'),
      ],
      output: {
        manualChunks: {
          three: ['three', 'three-stdlib'],
        },
      },
    },
  },
  plugins: [
    // Gzip-komprimierte Kopien für Server die Accept-Encoding: gzip unterstützen
    compression({ algorithm: 'gzip', exclude: [/\.(png|jpg|glb|woff2?)$/i] }),
    // Brotli für moderne Browser (bessere Kompression als Gzip)
    compression({ algorithm: 'brotliCompress', exclude: [/\.(png|jpg|glb|woff2?)$/i] }),
  ],
});
