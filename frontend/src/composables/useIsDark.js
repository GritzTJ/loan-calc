import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Composable réactif qui détecte si le dark mode est actif
 * en observant la classe `dark` sur <html>.
 */
export function useIsDark() {
  const isDark = ref(document.documentElement.classList.contains('dark'))
  let observer = null

  onMounted(() => {
    observer = new MutationObserver(() => {
      isDark.value = document.documentElement.classList.contains('dark')
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  return { isDark }
}
