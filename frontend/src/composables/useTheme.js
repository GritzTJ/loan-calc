import { ref, watch } from 'vue'

// Modes possibles : 'system', 'light', 'dark'
const mode = ref(localStorage.getItem('theme') || 'system')

function getSystemPreference() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Fond de l'app dans chaque thème (--bg dans main.css) : sert de couleur à la barre système
const THEME_COLORS = { light: '#f4f6f7', dark: '#141b21' }

function applyTheme() {
  const effectiveTheme = mode.value === 'system' ? getSystemPreference() : mode.value
  document.documentElement.classList.toggle('dark', effectiveTheme === 'dark')
  // Les balises theme-color de index.html suivent le thème système ; on les aligne
  // sur le thème réellement affiché quand l'utilisateur en force un autre.
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute('content', THEME_COLORS[effectiveTheme])
  })
}

// Écoute les changements de préférence système
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (mode.value === 'system') applyTheme()
})

// Persiste et applique à chaque changement
watch(mode, (val) => {
  localStorage.setItem('theme', val)
  applyTheme()
}, { immediate: true })

export function useTheme() {
  // Cycle : system → light → dark → system
  function toggleTheme() {
    const cycle = { system: 'light', light: 'dark', dark: 'system' }
    mode.value = cycle[mode.value]
  }

  return { mode, toggleTheme }
}
