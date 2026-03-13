import { ref, watch } from 'vue'

// Modes possibles : 'system', 'light', 'dark'
const mode = ref(localStorage.getItem('theme') || 'system')

function getSystemPreference() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme() {
  const effectiveTheme = mode.value === 'system' ? getSystemPreference() : mode.value
  document.documentElement.classList.toggle('dark', effectiveTheme === 'dark')
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
