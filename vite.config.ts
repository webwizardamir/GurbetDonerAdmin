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
})
