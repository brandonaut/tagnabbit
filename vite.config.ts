import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/tagnabbit/" : "/",
  // server: {
  //   proxy: {
  //     '/bst-proxy': {
  //       target: 'https://www.barbershoptags.com',
  //       changeOrigin: true,
  //       rewrite: (path) => path.replace(/^\/bst-proxy/, ''),
  //     },
  //   },
  // },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,

      pwaAssets: {
        disabled: false,
        config: true,
      },

      manifest: {
        name: "tagnabbit",
        short_name: "tagnabbit",
        description: "Search Barbershop Tags Fast",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        screenshots: [
          {
            src: "screenshots/narrow.png",
            sizes: "322x716",
            type: "image/png",
            form_factor: "narrow",
            label: "Search barbershop tags",
          },
          {
            src: "screenshots/wide.png",
            sizes: "852x546",
            type: "image/png",
            form_factor: "wide",
            label: "Search barbershop tags",
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}", "tags-snapshot.json"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },

      devOptions: {
        enabled: false,
        navigateFallback: "index.html",
        suppressWarnings: true,
        type: "module",
      },
    }),
  ],
}))
