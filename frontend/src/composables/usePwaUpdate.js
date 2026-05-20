import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

// État partagé : true quand une nouvelle version est prête à être activée
const needRefresh = ref(false)
let updateSW = null

// Enregistrement du service worker au démarrage de l'app
updateSW = registerSW({
  onNeedRefresh() {
    needRefresh.value = true
  },
  onRegisterError(err) {
    console.error('[PWA] Service worker registration failed:', err)
  }
})

function applyUpdate() {
  if (updateSW) updateSW(true)
}

export function usePwaUpdate() {
  return { needRefresh, applyUpdate }
}
