<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">Simulateur de prêt</h2>
      <button
        v-if="isValid"
        @click="showSaveModal = true"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
               text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30
               border border-blue-200 dark:border-blue-800 rounded-lg
               hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        Sauvegarder
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Montant emprunté -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Montant emprunté (€)</label>
        <NumberInput v-model="principal" placeholder="200 000" />
      </div>

      <!-- Taux annuel -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taux annuel (%)</label>
        <NumberInput v-model="annualRate" :decimals="2" placeholder="3,50" />
      </div>

      <!-- Nombre de mensualités -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de mensualités</label>
        <NumberInput v-model="months" placeholder="240" />
        <p v-if="months" class="text-xs text-gray-400 dark:text-gray-500 mt-1">
          = {{ Math.floor(months / 12) }} an{{ Math.floor(months / 12) > 1 ? 's' : '' }}
          <span v-if="months % 12"> et {{ months % 12 }} mois</span>
        </p>
      </div>

      <!-- Date de début -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de début</label>
        <input v-model="startDateStr" type="date" class="input-field" />
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
          1re mensualité le {{ firstPaymentLabel }}
        </p>
      </div>

      <!-- Taux assurance (optionnel) -->
      <div class="sm:col-span-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Taux assurance (%/an)
          <span class="font-normal text-gray-400 dark:text-gray-500">(optionnel)</span>
        </label>
        <NumberInput
          v-model="insuranceRate"
          :decimals="2"
          input-class="input-field sm:w-1/2"
          placeholder="0,30"
        />
      </div>
    </div>

    <!-- Résultat mensualité -->
    <div v-if="isValid" class="mt-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5 transition-colors">
      <div class="text-center">
        <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mensualité crédit</div>
        <div class="text-3xl font-bold text-blue-700 dark:text-blue-400 mt-1">
          {{ formatCurrency(monthlyPayment) }}
        </div>
      </div>
      <!-- Assurance -->
      <div v-if="monthlyInsurance > 0" class="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 flex justify-between text-sm">
        <span class="text-gray-500 dark:text-gray-400">+ Assurance / mois</span>
        <span class="font-semibold text-gray-700 dark:text-gray-300">{{ formatCurrency(monthlyInsurance) }}</span>
      </div>
      <div v-if="monthlyInsurance > 0" class="mt-2 flex justify-between text-sm font-bold">
        <span class="text-gray-700 dark:text-gray-200">= Mensualité totale</span>
        <span class="text-blue-700 dark:text-blue-400">{{ formatCurrency(monthlyPayment + monthlyInsurance) }}</span>
      </div>
    </div>

    <!-- Tableau d'amortissement -->
    <AmortizationTable
      v-if="isValid"
      :rows="amortizationTable"
      :monthly-insurance="monthlyInsurance"
    />

    <!-- Modal de sauvegarde -->
    <div v-if="showSaveModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showSaveModal = false">
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 w-80 shadow-xl">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Nommer la simulation</h3>
        <input
          v-model="saveName"
          type="text"
          class="input-field mb-4"
          placeholder="Ex : Appart Lyon - 20 ans"
          @keyup.enter="onSave"
          autofocus
        />
        <div class="flex gap-2 justify-end">
          <button
            @click="showSaveModal = false"
            class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            @click="onSave"
            :disabled="!saveName.trim()"
            class="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  calculateMonthlyPayment,
  calculateInsuranceCost,
  generateAmortizationTable,
  getDefaultStartDate,
  formatCurrency,
  formatDate
} from '../services/loanCalculator.js'
import { saveSimulation } from '../services/storageService.js'
import AmortizationTable from './AmortizationTable.vue'
import NumberInput from './NumberInput.vue'

// --- State ---
const principal = ref(200000)
const annualRate = ref(3.5)
const months = ref(240)
const insuranceRate = ref(null)

// Date de début : par défaut = 1er du mois prochain
const defaultDate = getDefaultStartDate()
const startDateStr = ref(
  `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, '0')}-01`
)

// Modal sauvegarde
const showSaveModal = ref(false)
const saveName = ref('')

// Permet de charger une simulation depuis l'historique
const props = defineProps({
  loadParams: { type: Object, default: null }
})

// Quand loadParams change (chargement depuis l'historique), préremplir les champs
import { watch } from 'vue'
watch(() => props.loadParams, (p) => {
  if (!p) return
  principal.value = p.principal ?? principal.value
  annualRate.value = p.annualRate ?? annualRate.value
  months.value = p.months ?? months.value
  insuranceRate.value = p.insuranceRate ?? null
  if (p.startDate) startDateStr.value = p.startDate
}, { immediate: true })

// --- Computed ---
const startDate = computed(() => new Date(startDateStr.value + 'T00:00:00'))

const firstPaymentLabel = computed(() => {
  const d = new Date(startDate.value.getFullYear(), startDate.value.getMonth() + 1, 1)
  return formatDate(d)
})

const isValid = computed(() =>
  principal.value > 0 && typeof annualRate.value === 'number' && annualRate.value >= 0 && months.value > 0
)

const monthlyPayment = computed(() =>
  calculateMonthlyPayment(principal.value, annualRate.value, months.value)
)

const monthlyInsurance = computed(() =>
  calculateInsuranceCost(principal.value, insuranceRate.value)
)

const amortizationTable = computed(() =>
  generateAmortizationTable(principal.value, annualRate.value, months.value, startDate.value)
)

// --- Actions ---
async function onSave() {
  if (!saveName.value.trim()) return
  await saveSimulation(saveName.value.trim(), 'loan', {
    principal: principal.value,
    annualRate: annualRate.value,
    months: months.value,
    startDate: startDateStr.value,
    insuranceRate: insuranceRate.value
  })
  showSaveModal.value = false
  saveName.value = ''
}
</script>
