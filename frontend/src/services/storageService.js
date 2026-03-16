/**
 * Couche d'abstraction pour la persistance des simulations.
 * Appels vers l'API REST Express/SQLite (backend v2).
 */

const BASE_URL = '/api/simulations'

/**
 * Sauvegarde une simulation.
 * @param {string} name - Nom donné par l'utilisateur
 * @param {'loan'|'capacity'} type - Type de simulation
 * @param {Object} params - Paramètres d'entrée
 * @returns {Promise<Object|null>} La simulation sauvegardée, ou null en cas d'erreur
 */
export async function saveSimulation(name, type, params) {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, params })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('[storageService] saveSimulation() échoué :', err)
    return null
  }
}

/**
 * Récupère toutes les simulations sauvegardées.
 * @returns {Promise<Array>} Liste des simulations
 */
export async function getSimulations() {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('[storageService] getSimulations() échoué :', err)
    return []
  }
}

/**
 * Supprime une simulation par son ID.
 * @param {string|number} id
 * @returns {Promise<boolean>}
 */
export async function deleteSimulation(id) {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
    return res.ok
  } catch (err) {
    console.error('[storageService] deleteSimulation() échoué :', err)
    return false
  }
}
