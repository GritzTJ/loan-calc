<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">Capacité d'emprunt</h2>
      <SaveSimulation v-if="isValid" placeholder="Ex : Capacité emprunt 2026" :save="onSave" />
    </div>

    <!-- Toggle mode de saisie -->
    <SegmentedControl
      v-model="inputMode"
      class="mb-5"
      aria-label="Mode de saisie"
      :options="[
        { value: 'income', label: 'Par revenus' },
        { value: 'payment', label: 'Mensualité connue' }
      ]"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Mode "Par revenus" -->
      <template v-if="inputMode === 'income'">
        <FormField v-slot="{ id }" label="Revenus nets mensuels (€)">
          <NumberInput :id="id" v-model="monthlyIncome" placeholder="4 000" />
        </FormField>

        <FormField v-slot="{ id }" label="Charges mensuelles (€)">
          <NumberInput :id="id" v-model="monthlyCharges" placeholder="500" />
        </FormField>

        <FormField v-slot="{ id }" label="Taux d'endettement cible (%)">
          <NumberInput :id="id" v-model="debtRatio" :max="100" placeholder="35" />
        </FormField>
      </template>

      <!-- Mode "Mensualité connue" -->
      <template v-if="inputMode === 'payment'">
        <FormField v-slot="{ id }" class="sm:col-span-2" label="Mensualité que je peux assumer (€)">
          <NumberInput :id="id" v-model="directPayment" placeholder="1 200" />
        </FormField>
      </template>

      <!-- Champs communs aux deux modes -->
      <FormField label="Durée souhaitée (mois)">
        <template #default="{ id }">
          <NumberInput :id="id" v-model="months" :max="MAX_LOAN_MONTHS" placeholder="240" />
        </template>
        <template v-if="months" #help>= {{ formatDuration(months) }}</template>
      </FormField>

      <FormField v-slot="{ id }" label="Taux annuel (%)">
        <NumberInput :id="id" v-model="annualRate" :decimals="2" :max="MAX_RATE" placeholder="3,50" />
      </FormField>

      <FormField v-slot="{ id }" label="Taux assurance (%/an)" hint="(optionnel)">
        <NumberInput :id="id" v-model="insuranceRate" :decimals="2" :max="MAX_RATE" placeholder="0,30" />
      </FormField>
    </div>

    <!-- Résultats -->
    <div v-if="isValid" class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5 text-center transition-colors">
        <div class="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Mensualité {{ monthlyInsurance > 0 ? 'crédit max' : 'maximale' }}
          <InfoTooltip
            v-if="inputMode === 'income'"
            principe="Plafond d'endettement appliqué aux revenus"
            :calcul="paymentTooltip"
          />
        </div>
        <div class="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">
          {{ formatCurrency(maxPayment) }}
        </div>
        <!-- Le montant ci-dessus est hors assurance : on l'ajoute pour retrouver le budget mensuel -->
        <div v-if="monthlyInsurance > 0" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          + {{ formatCurrency(monthlyInsurance) }} d'assurance = {{ formatCurrency(monthlyBudget) }} au total
        </div>
      </div>
      <div class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-5 text-center transition-colors">
        <div class="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Capital empruntable
          <InfoTooltip
            principe="Formule inverse d'amortissement à taux fixe"
            :calcul="`${formatCurrency(maxPayment)} à ${formatPercent(annualRate)} sur ${months} mois`"
          />
        </div>
        <div class="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">
          {{ formatCurrency(capacity) }}
        </div>
      </div>
    </div>

    <!-- Alerte : aucun budget mensuel disponible -->
    <div v-if="isValid && maxPayment <= 0" class="mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
      Vos charges dépassent la capacité d'endettement. Réduisez vos charges ou augmentez vos revenus.
    </div>

    <!-- Sous-section prix du bien -->
    <PropertyPrice v-if="isValid && capacity > 0" :borrowing-capacity="capacity" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  calculateMaxMonthlyPayment,
  calculateBorrowingCapacity,
  calculateInsuranceCost,
  formatCurrency,
  formatDuration,
  formatPercent,
  MAX_LOAN_MONTHS,
  MAX_RATE
} from '../services/loanCalculator.js'
import { saveSimulation } from '../services/storageService.js'
import PropertyPrice from './PropertyPrice.vue'
import FormField from './FormField.vue'
import NumberInput from './NumberInput.vue'
import InfoTooltip from './InfoTooltip.vue'
import SaveSimulation from './SaveSimulation.vue'
import SegmentedControl from './SegmentedControl.vue'

// Chargement depuis l'historique
const props = defineProps({
  loadParams: { type: Object, default: null }
})

// --- State ---
const inputMode = ref('income') // 'income' | 'payment'

// Mode "Par revenus"
const monthlyIncome = ref(4000)
const monthlyCharges = ref(0)
const debtRatio = ref(35)

// Mode "Mensualité connue"
const directPayment = ref(null)

// Communs aux deux modes
const months = ref(240)
const annualRate = ref(3.5)
const insuranceRate = ref(null)

watch(() => props.loadParams, (p) => {
  if (!p) return
  monthlyIncome.value = p.monthlyIncome ?? monthlyIncome.value
  monthlyCharges.value = p.monthlyCharges ?? monthlyCharges.value
  debtRatio.value = p.debtRatio ?? debtRatio.value
  months.value = p.months ?? months.value
  annualRate.value = p.annualRate ?? annualRate.value
  insuranceRate.value = p.insuranceRate ?? null
  // Restaurer le mode si sauvegardé
  if (p.inputMode) inputMode.value = p.inputMode
  if (p.directPayment != null) directPayment.value = p.directPayment
}, { immediate: true })

// --- Computed ---
const isValid = computed(() => {
  if (months.value <= 0 || typeof annualRate.value !== 'number' || annualRate.value < 0) return false
  if (inputMode.value === 'income') {
    return monthlyIncome.value > 0 && typeof debtRatio.value === 'number' && debtRatio.value > 0
  }
  return directPayment.value > 0
})

// Budget mensuel total : il doit couvrir la mensualité de crédit ET l'assurance
const monthlyBudget = computed(() => {
  if (inputMode.value === 'income') {
    return calculateMaxMonthlyPayment(monthlyIncome.value, monthlyCharges.value || 0, debtRatio.value)
  }
  return directPayment.value || 0
})

// Capital dont la mensualité + l'assurance consomment exactement le budget
const capacity = computed(() =>
  calculateBorrowingCapacity(monthlyBudget.value, annualRate.value, months.value, insuranceRate.value || 0)
)

const monthlyInsurance = computed(() =>
  calculateInsuranceCost(capacity.value, insuranceRate.value)
)

// Part du budget disponible pour le crédit seul
const maxPayment = computed(() =>
  Math.max(0, Math.round((monthlyBudget.value - monthlyInsurance.value) * 100) / 100)
)

const paymentTooltip = computed(() => {
  const base = `${formatCurrency(monthlyIncome.value)} × ${formatPercent(debtRatio.value)} − ${formatCurrency(monthlyCharges.value || 0)}`
  return monthlyInsurance.value > 0
    ? `${base} − ${formatCurrency(monthlyInsurance.value)} d'assurance`
    : base
})

// --- Actions ---
// Lève une erreur en cas d'échec : SaveSimulation l'affiche et garde la modale ouverte
function onSave(name) {
  const params = {
    inputMode: inputMode.value,
    months: months.value,
    annualRate: annualRate.value,
    insuranceRate: insuranceRate.value
  }
  if (inputMode.value === 'income') {
    params.monthlyIncome = monthlyIncome.value
    params.monthlyCharges = monthlyCharges.value
    params.debtRatio = debtRatio.value
  } else {
    params.directPayment = directPayment.value
  }
  return saveSimulation(name, 'capacity', params)
}
</script>
