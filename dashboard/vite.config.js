import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: '/dashboard/',
  plugins: [react()],
  resolve: {
    // Was provided by @base44/vite-plugin; matches jsconfig.json's "@/*" path.
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    // Dev-only: dashboard's Vite server and beinabein-api run on different
    // ports locally; in production they're the same origin (one Express app
    // serves both), so no equivalent is needed there.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
