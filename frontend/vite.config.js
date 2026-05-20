import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Simulateur de Prêt Immobilier',
        short_name: 'Loan Calc',
        description: 'Simulateur de prêt immobilier — usage personnel',
        lang: 'fr',
        theme_color: '#2563eb',
        background_color: '#f9fafb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
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
