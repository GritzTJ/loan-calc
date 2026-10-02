<template>
  <section>
    <h2 class="text-xl font-semibold text-ink">Historique</h2>

    <!-- Chargement -->
    <p v-if="loading" class="mt-6 text-sm text-ink-3">Chargement…</p>

    <!-- Échec du chargement : à ne pas confondre avec une liste vide -->
    <div v-else-if="loadError" role="alert" class="notice notice-danger mt-6">
      <p>Impossible de charger l'historique. {{ loadError.message }}</p>
      <a v-if="loadError.status === 401" href="/auth/login" class="inline-block mt-2 font-medium underline">Se reconnecter</a>
      <button v-else type="button" class="mt-2 font-medium underline" @click="fetchSimulations">Réessayer</button>
    </div>

    <!-- Liste vide : dire comment la remplir -->
    <div v-else-if="simulations.length === 0" class="mt-6 text-sm text-ink-2 max-w-prose">
      <p class="font-medium text-ink">Aucune simulation enregistrée.</p>
      <p class="mt-1">Le bouton « Enregistrer » du simulateur et de la capacité d'emprunt conserve une saisie pour la retrouver ici.</p>
    </div>

    <!-- Liste des simulations -->
    <ul v-else class="mt-5 border border-line rounded-2xl bg-surface divide-y divide-line">
      <li v-for="sim in simulations" :key="sim.id" class="px-4 py-3 sm:px-5">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="font-medium text-ink truncate">{{ sim.name }}</p>
            <p class="text-sm text-ink-2">{{ formatSimSummary(sim) }}</p>
            <p class="text-xs text-ink-3 mt-0.5">Enregistrée le {{ formatDate(new Date(sim.created_at)) }}</p>
          </div>

          <!-- Suppression en deux temps : le premier clic demande confirmation dans la ligne -->
          <div v-if="pendingDeleteId === sim.id" class="flex items-center gap-1 shrink-0">
            <button type="button" class="btn btn-quiet" @click="pendingDeleteId = null">Annuler</button>
            <button type="button" class="btn bg-danger text-surface" @click="onDelete(sim.id)">Supprimer</button>
          </div>
          <div v-else class="flex items-center gap-1 shrink-0">
            <button type="button" class="btn btn-secondary" @click="onLoad(sim)">Ouvrir</button>
            <button
              type="button"
              class="btn btn-quiet px-3"
              :aria-label="`Supprimer « ${sim.name} »`"
              @click="askDelete(sim.id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <p v-if="deleteError?.id === sim.id" role="alert" class="mt-2 text-sm text-danger">
          Suppression impossible. {{ deleteError.message }}
        </p>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, onActivated } from 'vue'
import { getSimulations, deleteSimulation } from '../services/storageService.js'
import { formatDate, formatCurrency, formatDuration, formatPercent } from '../services/loanCalculator.js'

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

// Une phrase plutôt qu'une suite de valeurs : « Prêt de 200 000 € à 3,5 % sur 20 ans »
function formatSimSummary(sim) {
  const p = sim.params
  const duration = formatDuration(p.months)
  if (sim.type === 'loan') {
    return `Prêt de ${formatCurrency(p.principal)} à ${formatPercent(p.annualRate)} sur ${duration}`
  }
  // Une capacité est enregistrée soit par revenus, soit par mensualité connue
  if (p.inputMode === 'payment') {
    return `Capacité pour ${formatCurrency(p.directPayment)} par mois sur ${duration}`
  }
  return `Capacité pour ${formatCurrency(p.monthlyIncome)} de revenus, ${formatPercent(p.debtRatio)} d'endettement, sur ${duration}`
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
