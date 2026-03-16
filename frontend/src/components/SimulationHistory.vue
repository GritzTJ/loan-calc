<template>
  <div>
    <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Historique des simulations</h2>

    <!-- Chargement -->
    <div v-if="loading" class="text-center py-12 text-gray-400 dark:text-gray-500">
      Chargement…
    </div>

    <!-- Liste vide -->
    <div v-else-if="simulations.length === 0" class="text-center py-12 text-gray-400 dark:text-gray-500">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
      <p class="text-sm">Aucune simulation sauvegardée.</p>
      <p class="text-xs mt-1">Utilisez le bouton "Sauvegarder" dans le simulateur ou la capacité.</p>
    </div>

    <!-- Liste des simulations -->
    <ul v-else class="space-y-2">
      <li
        v-for="sim in simulations"
        :key="sim.id"
        class="flex items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-700/50
               border border-gray-200 dark:border-gray-700 rounded-xl transition-colors"
      >
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
        <div class="flex items-center gap-2 shrink-0">
          <button
            @click="onLoad(sim)"
            class="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400
                   bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800
                   rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            Charger
          </button>
          <button
            @click="onDelete(sim.id)"
            class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Supprimer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getSimulations, deleteSimulation } from '../services/storageService.js'
import { formatDate, formatCurrency } from '../services/loanCalculator.js'

const emit = defineEmits(['load'])

const simulations = ref([])
const loading = ref(true)

async function fetchSimulations() {
  loading.value = true
  simulations.value = await getSimulations()
  loading.value = false
}

onMounted(fetchSimulations)

function formatSimSummary(sim) {
  const p = sim.params
  if (sim.type === 'loan') {
    return `${formatCurrency(p.principal)} · ${p.annualRate}% · ${p.months} mois`
  }
  return `${formatCurrency(p.monthlyIncome)}/mois · ${p.debtRatio}% · ${p.months} mois`
}

async function onDelete(id) {
  await deleteSimulation(id)
  await fetchSimulations()
}

function onLoad(sim) {
  // Émet l'événement vers App.vue pour switcher d'onglet et préremplir les champs
  emit('load', { type: sim.type, params: sim.params })
}
</script>
