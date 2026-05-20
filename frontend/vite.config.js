import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png', 'icons/splash-*.png'],
      manifest: {
        name: 'Simulateur de Prêt Immobilier',
        short_name: 'Loan Calc',
        description: 'Simulateur de prêt immobilier — usage personnel',
        lang: 'fr',
        theme_color: '#2563eb',
        background_color: '#f9fafb',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        // Raccourcis sur appui long de l'icône (Android)
        shortcuts: [
          { name: 'Simulateur', short_name: 'Simulateur', url: '/?tab=simulator', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Capacité', short_name: 'Capacité', url: '/?tab=capacity', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Projet', short_name: 'Projet', url: '/?tab=project', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Historique', short_name: 'Historique', url: '/?tab=history', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] }
        ]
      },
      workbox: {
        // Les requêtes vers /api et /auth doivent toujours passer au réseau (auth + données dynamiques)
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        // Ne mets pas l'index en cache pour les routes API/auth — toujours laisser le serveur répondre
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true
      }
    })
  ],
  server: {
    port: 5173,
    host: true,
    // Proxy l'API vers le backend Express en développement local
    proxy: {
      '/api': 'http://localhost:3000',
      '/auth': 'http://localhost:3000'
    }
  }
})
