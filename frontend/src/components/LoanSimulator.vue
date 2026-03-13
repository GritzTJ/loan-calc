<template>
  <div>
    <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Simulateur de prêt</h2>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Montant emprunté -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Montant emprunté (€)</label>
        <NumberInput
          v-model="principal"
          placeholder="200 000"
        />
      </div>

      <!-- Taux annuel -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taux annuel (%)</label>
        <NumberInput
          v-model="annualRate"
          :decimals="2"
          placeholder="3,50"
        />
      </div>

      <!-- Nombre de mensualités -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de mensualités</label>
        <NumberInput
          v-model="months"
          placeholder="240"
        />
        <p v-if="months" class="text-xs text-gray-400 dark:text-gray-500 mt-1">
          = {{ Math.floor(months / 12) }} an{{ Math.floor(months / 12) > 1 ? 's' : '' }}
          <span v-if="months % 12"> et {{ months % 12 }} mois</span>
        </p>
      </div>

      <!-- Date de début -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de début</label>
        <input
          v-model="startDateStr"
          type="date"
          class="input-field"
        />
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
          1re mensualité le {{ firstPaymentLabel }}
        </p>
      </div>
    </div>

    <!-- Résultat mensualité -->
    <div v-if="isValid" class="mt-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5 text-center transition-colors">
      <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mensualité</div>
      <div class="text-3xl font-bold text-blue-700 dark:text-blue-400 mt-1">
        {{ formatCurrency(monthlyPayment) }}
      </div>
    </div>

    <!-- Tableau d'amortissement -->
    <AmortizationTable v-if="isValid" :rows="amortizationTable" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  calculateMonthlyPayment,
  generateAmortizationTable,
  getDefaultStartDate,
  formatCurrency,
  formatDate
} from '../services/loanCalculator.js'
import AmortizationTable from './AmortizationTable.vue'
import NumberInput from './NumberInput.vue'

// --- State ---
const principal = ref(200000)
const annualRate = ref(3.5)
const months = ref(240)

// Date de début : par défaut = 1er du mois prochain
const defaultDate = getDefaultStartDate()
const startDateStr = ref(
  `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, '0')}-01`
)

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

const amortizationTable = computed(() =>
  generateAmortizationTable(principal.value, annualRate.value, months.value, startDate.value)
)

// TODO v2: exposer les données pour saveSimulation() via storageService
</script>
