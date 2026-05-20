import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import './assets/main.css'

// Service worker en mode autoUpdate : la nouvelle version s'applique au prochain reload complet
registerSW({ immediate: true })

createApp(App).mount('#app')
