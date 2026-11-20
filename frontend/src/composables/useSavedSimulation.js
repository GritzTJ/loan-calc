import { ref } from 'vue'
import { saveSimulation, updateSimulation } from '../services/storageService.js'

/**
 * Lien entre un onglet et la simulation de l'historique dont sa saisie provient.
 * Tant qu'il existe, « Enregistrer » propose de mettre cette simulation à jour plutôt que d'en créer une autre.
 *
 * @param {'loan'|'capacity'|'project'} type - Type de simulation de l'onglet
 * @param {() => Object} getParams - Paramètres à enregistrer (la saisie en cours)
 */
export function useSavedSimulation(type, getParams) {
  // { id, name } de la simulation ouverte ou tout juste enregistrée, sinon null
  const current = ref(null)

  // Les deux lèvent une ApiError en cas d'échec : SaveSimulation l'affiche et garde la modale ouverte
  async function save(name) {
    const saved = await saveSimulation(name, type, getParams())
    current.value = { id: saved.id, name: saved.name }
  }

  async function update() {
    await updateSimulation(current.value.id, { params: getParams() })
  }

  return { current, save, update }
}
