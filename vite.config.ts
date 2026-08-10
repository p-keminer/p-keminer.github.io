import { resolve } from 'path';
import { defineConfig, type Plugin } from 'vite';
import { compression } from 'vite-plugin-compression2';

const PRODUCTION_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "script-src-attr 'none'",
  "style-src 'self'",
  "style-src-elem 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "form-action 'none'",
  "manifest-src 'none'"
].join('; ');

function productionSecurityMeta(): Plugin {
  return {
    name: 'production-security-meta',
    apply: 'build',
    transformIndexHtml(_html, context) {
      if (!context.filename.endsWith('index.html')) {
        return;
      }

      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: PRODUCTION_CONTENT_SECURITY_POLICY
          },
          injectTo: 'head-prepend'
        }
      ];
    }
  };
}

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: [
        resolve(__dirname, 'index.html'),
        resolve(__dirname, '404.html')
      ],
      output: {
        manualChunks: {
          three: ['three', 'three-stdlib']
        }
      }
    }
  },
  plugins: [
    productionSecurityMeta(),
    compression({ algorithm: 'gzip', exclude: [/\.(png|jpg|glb|woff2?)$/i] }),
    compression({ algorithm: 'brotliCompress', exclude: [/\.(png|jpg|glb|woff2?)$/i] })
  ]
});
