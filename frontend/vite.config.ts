import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages deploys to /<repo-name>/
// Set VITE_BASE_URL in your CI/CD environment if needed.
const base = process.env.VITE_BASE_URL ?? '/'

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['lightweight-charts', 'recharts'],
          vendor: ['axios', 'zustand', 'date-fns'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
})
