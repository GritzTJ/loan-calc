/**
 * Couche d'abstraction pour la persistance des simulations.
 * Appels vers l'API REST Express/SQLite (backend v2).
 *
 * Chaque fonction lève une ApiError en cas d'échec : c'est à l'écran appelant de l'afficher.
 * (Renvoyer null ou [] ferait passer un échec pour un succès ou pour une liste vide.)
 */

const BASE_URL = '/api/simulations'

export class ApiError extends Error {
  /**
   * @param {number} status - Code HTTP, ou 0 si le serveur est injoignable
   * @param {string} message - Message affichable tel quel
   */
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(url, options) {
  let res
  try {
    res = await fetch(url, options)
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez la connexion et réessayez.')
  }
  if (res.status === 401) {
    throw new ApiError(401, 'Session expirée.')
  }
  if (!res.ok) {
    throw new ApiError(res.status, `Le serveur a répondu par une erreur (${res.status}). Réessayez.`)
  }
  return res
}

/**
 * Sauvegarde une simulation.
 * @param {string} name - Nom donné par l'utilisateur
 * @param {'loan'|'capacity'} type - Type de simulation
 * @param {Object} params - Paramètres d'entrée
 * @returns {Promise<Object>} La simulation sauvegardée
 * @throws {ApiError}
 */
export async function saveSimulation(name, type, params) {
  const res = await request(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type, params })
  })
  return res.json()
}

/**
 * Récupère toutes les simulations sauvegardées.
 * @returns {Promise<Array>} Liste des simulations
 * @throws {ApiError}
 */
export async function getSimulations() {
  const res = await request(BASE_URL)
  return res.json()
}

/**
 * Supprime une simulation par son ID.
 * @param {string|number} id
 * @returns {Promise<void>}
 * @throws {ApiError}
 */
export async function deleteSimulation(id) {
  await request(`${BASE_URL}/${id}`, { method: 'DELETE' })
}
