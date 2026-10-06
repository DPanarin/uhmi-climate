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
  // Pre-bundle lazily imported deps up front: discovering them at runtime makes Vite re-optimize and
  // reload mid-session, which breaks MapLibre's worker until a full reload.
  optimizeDeps: {
    include: ['maplibre-gl', 'chart.js', 'vue-chartjs', 'chartjs-plugin-annotation', 'topojson-client'],
  },
  build: {
    // No prefetch of lazy chunks: data and code load only when needed
    modulePreload: { polyfill: false },
  },
})
