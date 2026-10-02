<template>
  <div>
    <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Historique des simulations</h2>

    <!-- Chargement -->
    <div v-if="loading" class="text-center py-12 text-gray-400 dark:text-gray-500">
      Chargement…
    </div>

    <!-- Échec du chargement : à ne pas confondre avec une liste vide -->
    <div v-else-if="loadError" role="alert" class="text-center py-12 text-sm text-red-700 dark:text-red-400">
      <p>Impossible de charger l'historique. {{ loadError.message }}</p>
      <a v-if="loadError.status === 401" href="/auth/login" class="inline-block mt-3 underline">Se reconnecter</a>
      <button v-else type="button" class="mt-3 underline" @click="fetchSimulations">Réessayer</button>
    </div>

    <!-- Liste vide -->
    <div v-else-if="simulations.length === 0" class="text-center py-12 text-gray-400 dark:text-gray-500">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
      <p class="text-sm">Aucune simulation enregistrée.</p>
      <p class="text-xs mt-1">Utilisez le bouton « Enregistrer » dans le simulateur ou la capacité.</p>
    </div>

    <!-- Liste des simulations -->
    <ul v-else class="space-y-2">
      <li
        v-for="sim in simulations"
        :key="sim.id"
        class="p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full"
                :class="sim.type === 'loan'
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'"
              >
                {{ sim.type === 'loan' ? 'Prêt' : 'Capacité' }}
              </span>
              <span class="font-medium text-gray-800 dark:text-gray-100 truncate">{{ sim.name }}</span>
            </div>
            <p class="text-xs text-gray-400 dark:text-gray-500">
              {{ formatSimSummary(sim) }} · {{ formatDate(new Date(sim.created_at)) }}
            </p>
          </div>

          <!-- Suppression en deux temps : le premier clic demande confirmation dans la ligne -->
          <div v-if="pendingDeleteId === sim.id" class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              class="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              @click="pendingDeleteId = null"
            >
              Annuler
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              @click="onDelete(sim.id)"
            >
              Supprimer
            </button>
          </div>
          <div v-else class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400
                     bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800
                     rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              @click="onLoad(sim)"
            >
              Charger
            </button>
            <button
              type="button"
              class="p-2.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              :aria-label="`Supprimer « ${sim.name} »`"
              @click="askDelete(sim.id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <p v-if="deleteError?.id === sim.id" role="alert" class="mt-2 text-xs text-red-700 dark:text-red-400">
          Suppression impossible. {{ deleteError.message }}
        </p>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onActivated } from 'vue'
import { getSimulations, deleteSimulation } from '../services/storageService.js'
import { formatDate, formatCurrency, formatPercent } from '../services/loanCalculator.js'

const emit = defineEmits(['load'])

const simulations = ref([])
const loading = ref(true)
const loadError = ref(null)
const pendingDeleteId = ref(null)
const deleteError = ref(null) // { id, message }

async function fetchSimulations() {
  loading.value = true
  loadError.value = null
  try {
    simulations.value = await getSimulations()
  } catch (err) {
    loadError.value = err
  } finally {
    loading.value = false
  }
}

// L'onglet est conservé en mémoire (KeepAlive) : on recharge à chaque affichage,
// y compris le premier, pour voir les simulations enregistrées entre-temps.
onActivated(() => {
  pendingDeleteId.value = null
  deleteError.value = null
  fetchSimulations()
})

function formatSimSummary(sim) {
  const p = sim.params
  if (sim.type === 'loan') {
    return `${formatCurrency(p.principal)} · ${formatPercent(p.annualRate)} · ${p.months} mois`
  }
  // Une capacité est enregistrée soit par revenus, soit par mensualité connue
  if (p.inputMode === 'payment') {
    return `${formatCurrency(p.directPayment)}/mois · ${p.months} mois`
  }
  return `${formatCurrency(p.monthlyIncome)}/mois · ${formatPercent(p.debtRatio)} · ${p.months} mois`
}

function askDelete(id) {
  deleteError.value = null
  pendingDeleteId.value = id
}

async function onDelete(id) {
  pendingDeleteId.value = null
  try {
    await deleteSimulation(id)
    simulations.value = simulations.value.filter(sim => sim.id !== id)
  } catch (err) {
    deleteError.value = { id, message: err.message }
  }
}

function onLoad(sim) {
  // Émet l'événement vers App.vue pour switcher d'onglet et préremplir les champs
  emit('load', { type: sim.type, params: sim.params })
}
</script>
