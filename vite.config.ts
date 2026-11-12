import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { collectClipWidths } from './scripts/mp4-dimensions.ts'

/** Width of each gallery MP4, read from the file header when Vite builds. */
function clipWidthsPlugin(): Plugin {
  const virtual = '\0virtual:clip-widths'
  return {
    name: 'clip-widths',
    resolveId(source) {
      if (source === 'virtual:clip-widths') return virtual
    },
    load(id) {
      if (id !== virtual) return
      const widths = collectClipWidths()
      return `export const CLIP_WIDTHS = ${JSON.stringify(widths)}\n`
    },
  }
}

export default defineConfig(({ mode }) => ({
  // Dev stays at '/'. Production and preview use the Pages project path.
  base: mode === 'production' ? '/Motion-buddy/' : '/',
  plugins: [react(), clipWidthsPlugin()],
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
