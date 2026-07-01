import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
  },
  define: {
    // Polyfill for @react-pdf/renderer
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      // Buffer polyfill for @react-pdf/renderer
      buffer: 'buffer/',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  build: {
    // Modern browsers only — avoids over-transpiling and shrinks output.
    target: 'es2020',
    rollupOptions: {
      output: {
        // Keep heavy, lazily-used libraries in their own cacheable chunks so
        // they never weigh down the initial load. Route-level React.lazy already
        // keeps them off the login/portal paths; this isolates them further and
        // lets the browser cache vendor code across app deploys.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'pdf': ['@react-pdf/renderer'],
          'exceljs': ['exceljs'],
          'charts': ['recharts'],
        },
      },
    },
  },
})
