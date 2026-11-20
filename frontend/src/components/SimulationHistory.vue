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
      <p class="mt-1">Le bouton « Enregistrer » du simulateur, de la capacité d'emprunt et du projet conserve une saisie pour la retrouver ici.</p>
    </div>

    <!-- Liste des simulations -->
    <ul v-else class="mt-5 border border-line rounded-2xl bg-surface divide-y divide-line">
      <li v-for="sim in simulations" :key="sim.id" class="px-4 py-3 sm:px-5">
        <!-- Renommage dans la ligne : le nom devient un champ, validé par Entrée ou « OK » -->
        <form v-if="renaming?.id === sim.id" class="flex items-center gap-2" @submit.prevent="onRename">
          <input
            v-model="renaming.name"
            v-focus
            type="text"
            class="input-field h-11 min-w-0 flex-1"
            :maxlength="MAX_NAME_LENGTH"
            aria-label="Nouveau nom de la simulation"
            @keydown.esc="renaming = null"
          />
          <button type="button" class="btn btn-quiet px-3" :disabled="renaming.saving" @click="renaming = null">Annuler</button>
          <button type="submit" class="btn btn-primary" :disabled="!renaming.name.trim() || renaming.saving">OK</button>
        </form>

        <div v-else class="flex items-center justify-between gap-3">
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
          <div v-else class="flex items-center shrink-0">
            <button type="button" class="btn btn-secondary mr-1" @click="onLoad(sim)">Ouvrir</button>
            <!-- Seul un prêt se compare à un autre prêt -->
            <button
              v-if="sim.type === 'loan'"
              type="button"
              class="btn btn-quiet px-2.5"
              :aria-label="`Comparer « ${sim.name} »`"
              title="Ajouter à la comparaison"
              @click="emit('compare', { name: sim.name, params: sim.params })"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </button>
            <button
              type="button"
              class="btn btn-quiet px-2.5"
              :aria-label="`Renommer « ${sim.name} »`"
              @click="askRename(sim)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-.878.506L7 17l.666-3.95A2 2 0 018.172 12.172z" />
              </svg>
            </button>
            <button
              type="button"
              class="btn btn-quiet px-2.5"
              :aria-label="`Supprimer « ${sim.name} »`"
              @click="askDelete(sim.id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <p v-if="rowError?.id === sim.id" role="alert" class="mt-2 text-sm text-danger">
          {{ rowError.action }} impossible. {{ rowError.message }}
        </p>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, onActivated } from 'vue'
import { getSimulations, deleteSimulation, updateSimulation } from '../services/storageService.js'
import { formatDate, formatCurrency, formatEuros, formatDuration, formatPercent } from '../services/loanCalculator.js'

const emit = defineEmits(['load', 'compare'])

// Même limite que le backend (routes/simulations.js)
const MAX_NAME_LENGTH = 100

const simulations = ref([])
const loading = ref(true)
const loadError = ref(null)
const pendingDeleteId = ref(null)
const renaming = ref(null) // { id, name, saving }
const rowError = ref(null) // { id, action, message }

// Le champ de renommage prend le focus dès qu'il apparaît, texte sélectionné
const vFocus = { mounted: (el) => { el.focus(); el.select() } }

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
  renaming.value = null
  rowError.value = null
  fetchSimulations()
})

// Une phrase plutôt qu'une suite de valeurs : « Prêt de 200 000 € à 3,5 % sur 20 ans »
function formatSimSummary(sim) {
  const p = sim.params
  if (sim.type === 'project') {
    return `Projet d'achat à ${formatEuros(p.propertyPrice || 0)}, ${formatEuros(p.personalContribution || 0)} d'apport`
  }
  const duration = formatDuration(p.months)
  if (sim.type === 'loan') {
    return `Prêt de ${formatEuros(p.principal)} à ${formatPercent(p.annualRate)} sur ${duration}`
  }
  // Une capacité est enregistrée soit par revenus, soit par mensualité connue
  if (p.inputMode === 'payment') {
    return `Capacité pour ${formatCurrency(p.directPayment)} par mois sur ${duration}`
  }
  return `Capacité pour ${formatEuros(p.monthlyIncome)} de revenus, ${formatPercent(p.debtRatio)} d'endettement, sur ${duration}`
}

function askDelete(id) {
  rowError.value = null
  pendingDeleteId.value = id
}

async function onDelete(id) {
  pendingDeleteId.value = null
  try {
    await deleteSimulation(id)
    simulations.value = simulations.value.filter(sim => sim.id !== id)
  } catch (err) {
    rowError.value = { id, action: 'Suppression', message: err.message }
  }
}

function askRename(sim) {
  rowError.value = null
  pendingDeleteId.value = null
  renaming.value = { id: sim.id, name: sim.name, saving: false }
}

async function onRename() {
  const { id, name } = renaming.value
  if (!name.trim()) return
  renaming.value.saving = true
  try {
    const updated = await updateSimulation(id, { name: name.trim() })
    simulations.value = simulations.value.map(sim => (sim.id === id ? updated : sim))
    renaming.value = null
  } catch (err) {
    // Le champ reste ouvert : le nom saisi n'est pas perdu
    renaming.value.saving = false
    rowError.value = { id, action: 'Renommage', message: err.message }
  }
}

function onLoad(sim) {
  // Émet l'événement vers App.vue pour changer d'onglet et préremplir les champs.
  // source : l'onglet saura proposer de mettre cette simulation à jour.
  emit('load', { type: sim.type, params: sim.params, source: { id: sim.id, name: sim.name } })
}
</script>
