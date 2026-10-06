import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the app from https://dpanarin.github.io/uhmi-climate/
  base: '/uhmi-climate/',
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // MapLibre's worker is an ES module
  worker: { format: 'es' },
  build: {
    // No prefetch of lazy chunks: data and code load only when needed
    modulePreload: { polyfill: false },
  },
})
