import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'
// Enregistre le service worker PWA (auto-update)
import './composables/usePwaUpdate.js'

createApp(App).mount('#app')
