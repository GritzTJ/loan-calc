/**
 * Couche d'abstraction pour la persistance des simulations.
 *
 * V1 : pas de persistance, les méthodes sont des stubs.
 * V2 : remplacer les implémentations par des appels API REST
 *       vers un backend Express/Fastify + SQLite.
 *
 * Schéma v2 prévu :
 *   simulations(id, name, type, params_json, result_json, created_at, updated_at)
 *   - type: 'loan' | 'capacity'
 *   - params_json: les inputs sérialisés
 *   - result_json: les outputs sérialisés (mensualité, tableau, etc.)
 */

/**
 * Sauvegarde une simulation.
 * @param {string} name - Nom donné par l'utilisateur
 * @param {'loan'|'capacity'} type - Type de simulation
 * @param {Object} params - Paramètres d'entrée
 * @param {Object} result - Résultats calculés
 * @returns {Promise<Object|null>} La simulation sauvegardée, ou null
 */
export async function saveSimulation(name, type, params, result) {
  // TODO v2: POST /api/simulations { name, type, params, result }
  console.info('[storageService] saveSimulation() — stub v1, pas de persistance')
  return null
}

/**
 * Récupère toutes les simulations sauvegardées.
 * @param {'loan'|'capacity'|null} type - Filtrer par type (optionnel)
 * @returns {Promise<Array>} Liste des simulations
 */
export async function getSimulations(type = null) {
  // TODO v2: GET /api/simulations?type=...
  console.info('[storageService] getSimulations() — stub v1, retourne []')
  return []
}

/**
 * Récupère une simulation par son ID.
 * @param {string|number} id
 * @returns {Promise<Object|null>}
 */
export async function getSimulation(id) {
  // TODO v2: GET /api/simulations/:id
  console.info('[storageService] getSimulation() — stub v1, retourne null')
  return null
}

/**
 * Supprime une simulation par son ID.
 * @param {string|number} id
 * @returns {Promise<boolean>}
 */
export async function deleteSimulation(id) {
  // TODO v2: DELETE /api/simulations/:id
  console.info('[storageService] deleteSimulation() — stub v1')
  return false
}
