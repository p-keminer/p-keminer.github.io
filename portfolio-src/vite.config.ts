import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Embedded in 3D chess project at /portfolio/ — outputs directly to public/portfolio/
export default defineConfig({
  plugins: [react()],
  base: '/portfolio/',
  build: {
    outDir: '../public/portfolio',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
})
