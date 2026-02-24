import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/bst-proxy': {
        target: 'https://www.barbershoptags.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bst-proxy/, ''),
      },
    },
  },
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    injectRegister: false,

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      name: 'tagnabbit',
      short_name: 'tagnabbit',
      description: 'Search Barbershop Tags Fast',
      theme_color: '#ffffff',
    },

    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}', 'tags-snapshot.json'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
    },

    devOptions: {
      enabled: false,
      navigateFallback: 'index.html',
      suppressWarnings: true,
      type: 'module',
    },
  })],
})