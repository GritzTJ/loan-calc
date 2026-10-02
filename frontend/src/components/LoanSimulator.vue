<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">Simulateur de prêt</h2>
      <SaveSimulation v-if="isValid" placeholder="Ex : Appart Lyon - 20 ans" :save="onSave" />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField v-slot="{ id }" label="Montant emprunté (€)">
        <NumberInput :id="id" v-model="principal" placeholder="200 000" />
      </FormField>

      <FormField v-slot="{ id }" label="Taux annuel (%)">
        <NumberInput :id="id" v-model="annualRate" :decimals="2" :max="MAX_RATE" placeholder="3,50" />
      </FormField>

      <FormField label="Nombre de mensualités">
        <template #default="{ id }">
          <NumberInput :id="id" v-model="months" :max="MAX_LOAN_MONTHS" placeholder="240" />
        </template>
        <template v-if="months" #help>= {{ formatDuration(months) }}</template>
      </FormField>

      <FormField label="Date de début">
        <template #default="{ id }">
          <input :id="id" v-model="startDateStr" type="date" class="input-field" />
        </template>
        <template #help>1re mensualité le {{ firstPaymentLabel }}</template>
      </FormField>

      <FormField v-slot="{ id }" label="Taux assurance (%/an)" hint="(optionnel)">
        <NumberInput :id="id" v-model="insuranceRate" :decimals="2" :max="MAX_RATE" placeholder="0,30" />
      </FormField>

      <FormField v-slot="{ id }" label="Frais de dossier (€)" hint="(optionnel)">
        <NumberInput :id="id" v-model="applicationFees" placeholder="0" />
      </FormField>
    </div>

    <!-- Résultat mensualité -->
    <div v-if="isValid" class="mt-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5 transition-colors">
      <div class="text-center">
        <div class="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Mensualité crédit
          <InfoTooltip
            principe="Amortissement à taux fixe sur la durée"
            :calcul="`${formatCurrency(principal)} à ${formatPercent(annualRate)} sur ${months} mois`"
          />
        </div>
        <div class="text-3xl font-bold text-blue-700 dark:text-blue-400 mt-1">
          {{ formatCurrency(monthlyPayment) }}
        </div>
      </div>
      <!-- Assurance -->
      <div v-if="monthlyInsurance > 0" class="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 flex justify-between text-sm">
        <span class="text-gray-500 dark:text-gray-400 inline-flex items-center">
          + Assurance / mois
          <InfoTooltip
            principe="Cotisation assurance emprunteur mensuelle"
            :calcul="`${formatCurrency(principal)} × ${formatPercent(insuranceRate)} / 12`"
          />
        </span>
        <span class="font-semibold text-gray-700 dark:text-gray-300">{{ formatCurrency(monthlyInsurance) }}</span>
      </div>
      <div v-if="monthlyInsurance > 0" class="mt-2 flex justify-between text-sm font-bold">
        <span class="text-gray-700 dark:text-gray-200 inline-flex items-center">
          = Mensualité totale
          <InfoTooltip
            principe="Charge mensuelle totale due à la banque"
            :calcul="`${formatCurrency(monthlyPayment)} + ${formatCurrency(monthlyInsurance)}`"
          />
        </span>
        <span class="text-blue-700 dark:text-blue-400">{{ formatCurrency(monthlyPayment + monthlyInsurance) }}</span>
      </div>
    </div>

    <!-- Tableau d'amortissement -->
    <AmortizationTable
      v-if="isValid"
      :rows="amortizationTable"
      :monthly-insurance="monthlyInsurance"
      :application-fees="applicationFees || 0"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  calculateMonthlyPayment,
  calculateInsuranceCost,
  generateAmortizationTable,
  getDefaultStartDate,
  formatCurrency,
  formatDate,
  formatDuration,
  formatPercent,
  MAX_LOAN_MONTHS,
  MAX_RATE
} from '../services/loanCalculator.js'
import { saveSimulation } from '../services/storageService.js'
import AmortizationTable from './AmortizationTable.vue'
import FormField from './FormField.vue'
import NumberInput from './NumberInput.vue'
import InfoTooltip from './InfoTooltip.vue'
import SaveSimulation from './SaveSimulation.vue'

// Permet de charger une simulation depuis l'historique
const props = defineProps({
  loadParams: { type: Object, default: null }
})

// --- State ---
const principal = ref(null)
const annualRate = ref(null)
const months = ref(null)
const insuranceRate = ref(null)
const applicationFees = ref(null)

// Date de début : par défaut = 1er du mois prochain
const defaultDate = getDefaultStartDate()
const startDateStr = ref(
  `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, '0')}-01`
)

// Quand loadParams change (chargement depuis l'historique), préremplir les champs
watch(() => props.loadParams, (p) => {
  if (!p) return
  principal.value = p.principal ?? principal.value
  annualRate.value = p.annualRate ?? annualRate.value
  months.value = p.months ?? months.value
  insuranceRate.value = p.insuranceRate ?? null
  applicationFees.value = p.applicationFees ?? null
  if (p.startDate) startDateStr.value = p.startDate
}, { immediate: true })

// --- Computed ---
// Champ date vidé : on retombe sur la date par défaut plutôt que d'afficher « Invalid Date » partout
const startDate = computed(() => {
  const date = new Date(startDateStr.value + 'T00:00:00')
  return isNaN(date) ? getDefaultStartDate() : date
})

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
// Lève une erreur en cas d'échec : SaveSimulation l'affiche et garde la modale ouverte
function onSave(name) {
  return saveSimulation(name, 'loan', {
    principal: principal.value,
    annualRate: annualRate.value,
    months: months.value,
    startDate: startDateStr.value,
    insuranceRate: insuranceRate.value,
    applicationFees: applicationFees.value
  })
}
</script>
