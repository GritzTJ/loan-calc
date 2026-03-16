import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: true,
    // Proxy l'API vers le backend Express en développement local
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
