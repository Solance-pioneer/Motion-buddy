import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  // Dev stays at '/'. Production and preview use the Pages project path.
  base: mode === 'production' ? '/Motion-buddy/' : '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: resolve('index.html'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 43123,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 43123,
    strictPort: true,
  },
}))
