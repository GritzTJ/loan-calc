<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">Capacité d'emprunt</h2>
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
      <!-- Revenus nets mensuels -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Revenus nets mensuels (€)</label>
        <NumberInput v-model="monthlyIncome" placeholder="4 000" />
      </div>

      <!-- Charges mensuelles -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Charges mensuelles (€)</label>
        <NumberInput v-model="monthlyCharges" placeholder="500" />
      </div>

      <!-- Taux d'endettement -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taux d'endettement cible (%)</label>
        <NumberInput v-model="debtRatio" placeholder="35" />
      </div>

      <!-- Durée souhaitée -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Durée souhaitée (mois)</label>
        <NumberInput v-model="months" placeholder="240" />
        <p v-if="months" class="text-xs text-gray-400 dark:text-gray-500 mt-1">
          = {{ Math.floor(months / 12) }} an{{ Math.floor(months / 12) > 1 ? 's' : '' }}
          <span v-if="months % 12"> et {{ months % 12 }} mois</span>
        </p>
      </div>

      <!-- Taux annuel -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taux annuel (%)</label>
        <NumberInput v-model="annualRate" :decimals="2" placeholder="3,50" />
      </div>

      <!-- Taux assurance -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Taux assurance (%/an)
          <span class="font-normal text-gray-400 dark:text-gray-500">(optionnel)</span>
        </label>
        <NumberInput v-model="insuranceRate" :decimals="2" placeholder="0,30" />
      </div>
    </div>

    <!-- Résultats -->
    <div v-if="isValid" class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5 text-center transition-colors">
        <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Mensualité {{ monthlyInsurance > 0 ? 'crédit max' : 'maximale' }}
        </div>
        <div class="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">
          {{ formatCurrency(maxPayment) }}
        </div>
        <div v-if="monthlyInsurance > 0" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          dont {{ formatCurrency(monthlyInsurance) }} assurance
        </div>
      </div>
      <div class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-5 text-center transition-colors">
        <div class="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Capital empruntable</div>
        <div class="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">
          {{ formatCurrency(capacity) }}
        </div>
      </div>
    </div>

    <!-- Alerte endettement négatif -->
    <div v-if="isValid && maxPayment <= 0" class="mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
      Vos charges dépassent la capacité d'endettement. Réduisez vos charges ou augmentez vos revenus.
    </div>

    <!-- Sous-section prix du bien -->
    <PropertyPrice v-if="isValid && capacity > 0" :borrowing-capacity="capacity" />

    <!-- Modal de sauvegarde -->
    <div v-if="showSaveModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showSaveModal = false">
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 w-80 shadow-xl">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Nommer la simulation</h3>
        <input
          v-model="saveName"
          type="text"
          class="input-field mb-4"
          placeholder="Ex : Capacité emprunt 2026"
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
import { ref, computed, watch } from 'vue'
import {
  calculateMaxMonthlyPayment,
  calculateBorrowingCapacity,
  calculateInsuranceCost,
  formatCurrency
} from '../services/loanCalculator.js'
import { saveSimulation } from '../services/storageService.js'
import PropertyPrice from './PropertyPrice.vue'
import NumberInput from './NumberInput.vue'

// --- State ---
const monthlyIncome = ref(4000)
const monthlyCharges = ref(500)
const debtRatio = ref(35)
const months = ref(240)
const annualRate = ref(3.5)
const insuranceRate = ref(null)

// Modal sauvegarde
const showSaveModal = ref(false)
const saveName = ref('')

// Chargement depuis l'historique
const props = defineProps({
  loadParams: { type: Object, default: null }
})

watch(() => props.loadParams, (p) => {
  if (!p) return
  monthlyIncome.value = p.monthlyIncome ?? monthlyIncome.value
  monthlyCharges.value = p.monthlyCharges ?? monthlyCharges.value
  debtRatio.value = p.debtRatio ?? debtRatio.value
  months.value = p.months ?? months.value
  annualRate.value = p.annualRate ?? annualRate.value
  insuranceRate.value = p.insuranceRate ?? null
}, { immediate: true })

// --- Computed ---
const isValid = computed(() =>
  monthlyIncome.value > 0 && months.value > 0
  && typeof annualRate.value === 'number' && annualRate.value >= 0
  && typeof debtRatio.value === 'number' && debtRatio.value > 0
)

// La mensualité assurance réduit la capacité de remboursement du crédit
const monthlyInsurance = computed(() =>
  // Estimation initiale basée sur un capital fictif 0 → sera affiné une fois le capital connu
  // On utilise la capacité brute pour estimer l'assurance
  calculateInsuranceCost(roughCapacity.value, insuranceRate.value)
)

const maxPaymentGross = computed(() =>
  calculateMaxMonthlyPayment(monthlyIncome.value, monthlyCharges.value || 0, debtRatio.value)
)

// Capital brut (sans déduire l'assurance) pour estimer l'assurance mensuelle
const roughCapacity = computed(() =>
  calculateBorrowingCapacity(maxPaymentGross.value, annualRate.value, months.value)
)

// Mensualité max pour le crédit = mensualité max globale - assurance estimée
const maxPayment = computed(() =>
  Math.max(0, Math.round((maxPaymentGross.value - monthlyInsurance.value) * 100) / 100)
)

const capacity = computed(() =>
  calculateBorrowingCapacity(maxPayment.value, annualRate.value, months.value)
)

// --- Actions ---
async function onSave() {
  if (!saveName.value.trim()) return
  await saveSimulation(saveName.value.trim(), 'capacity', {
    monthlyIncome: monthlyIncome.value,
    monthlyCharges: monthlyCharges.value,
    debtRatio: debtRatio.value,
    months: months.value,
    annualRate: annualRate.value,
    insuranceRate: insuranceRate.value
  })
  showSaveModal.value = false
  saveName.value = ''
}
</script>
