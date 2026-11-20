import { reactive, watch } from 'vue'

const PREFIX = 'loan-calc:'

/**
 * État d'un onglet conservé dans localStorage : la saisie survit au rechargement de la page
 * (fréquent sur iOS, qui recharge une PWA restée en arrière-plan).
 * C'est un brouillon propre à l'appareil ; l'Historique reste la sauvegarde durable.
 *
 * @param {string} key - Nom de l'onglet
 * @param {Object} defaults - Valeurs de départ ; leurs clés définissent ce qui est conservé
 * @returns {{ state: Object, reset: Function }} état réactif, et remise aux valeurs de départ
 */
export function usePersistedState(key, defaults) {
  const state = reactive(structuredClone(defaults))

  try {
    const stored = JSON.parse(localStorage.getItem(PREFIX + key))
    if (stored && typeof stored === 'object') {
      for (const name of Object.keys(defaults)) {
        // On ne reprend que les champs connus, et du même type que la valeur de départ
        // (une ancienne version de l'app peut avoir laissé autre chose). null = champ vidé.
        if (name in stored && isCompatible(stored[name], defaults[name])) state[name] = stored[name]
      }
    }
  } catch {
    // Contenu illisible ou stockage indisponible (navigation privée) : on part des valeurs de départ
  }

  watch(state, (value) => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // Stockage plein ou indisponible : la saisie reste en mémoire, comme avant
    }
  }, { deep: true })

  function reset() {
    Object.assign(state, structuredClone(defaults))
  }

  return { state, reset }
}

function isCompatible(value, fallback) {
  if (value === null) return true
  if (fallback === null) return typeof value === 'number' || typeof value === 'string'
  // Une liste (scénarios, prêts complémentaires) peut changer de longueur d'une visite à l'autre
  if (Array.isArray(fallback)) return Array.isArray(value)
  return typeof value === typeof fallback
}
