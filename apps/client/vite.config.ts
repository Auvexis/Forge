import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    vue(),
    // vueDevTools()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 23802,
    host: true, // Listen on all local IPs
    proxy: {
      '/api': {
        target: 'http://localhost:23801',
        changeOrigin: true,
        ws: true, // Allow websockets / SSE through proxy
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@vue-flow')) {
              return 'flow-vendor'
            }
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
              return 'vue-vendor'
            }
            if (id.includes('lucide-vue-next') || id.includes('@vueuse')) {
              return 'ui-vendor'
            }
            return 'vendor'
          }
        },
      },
    },
  },
})
