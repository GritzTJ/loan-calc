<template>
  <CalculatorLayout
    title="Simulateur de prêt"
    :ready="isValid"
    empty-hint="Saisissez un montant, un taux et une durée pour obtenir la mensualité."
  >
    <template #summary>
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-sm text-ink-2">{{ monthlyLabel }}</span>
        <span class="figure text-lg text-ink">{{ formatCurrency(monthlyTotal) }}</span>
      </div>
    </template>

    <template #form>
      <FormField v-slot="{ id }" label="Montant emprunté">
        <NumberInput :id="id" v-model="principal" suffix="€" placeholder="200 000" />
      </FormField>

      <FormField v-slot="{ id }" label="Taux annuel">
        <NumberInput :id="id" v-model="annualRate" :decimals="2" :max="MAX_RATE" suffix="%" placeholder="3,50" />
      </FormField>

      <DurationField v-model="months" />

      <FormField label="Date de début">
        <template #default="{ id }">
          <input :id="id" v-model="startDateStr" type="date" class="input-field" />
        </template>
        <template #help>Première mensualité le {{ firstPaymentLabel }}</template>
      </FormField>

      <FormField v-slot="{ id }" label="Taux d'assurance" hint="(optionnel)">
        <NumberInput :id="id" v-model="insuranceRate" :decimals="2" :max="MAX_RATE" suffix="% / an" placeholder="0,30" />
      </FormField>

      <FormField v-slot="{ id }" label="Frais de dossier" hint="(optionnel)">
        <NumberInput :id="id" v-model="applicationFees" suffix="€" placeholder="0" />
      </FormField>
    </template>

    <template #result>
      <p class="flex items-center text-sm text-ink-2">
        {{ monthlyLabel }}
        <InfoTooltip
          principe="Amortissement à taux fixe sur la durée"
          :calcul="`${formatCurrency(principal)} à ${formatPercent(annualRate)} sur ${months} mois`"
        />
      </p>
      <p class="figure text-hero text-ink mt-1.5">{{ formatCurrency(monthlyTotal) }}</p>
      <p v-if="monthlyInsurance > 0" class="mt-2 text-sm text-ink-2">
        dont <span class="figure text-ink">{{ formatCurrency(monthlyPayment) }}</span> de crédit
        et <span class="figure text-ink">{{ formatCurrency(monthlyInsurance) }}</span> d'assurance
      </p>
      <p class="mt-1 text-sm text-ink-3">
        Pendant {{ formatDuration(months) }}, à partir du {{ firstPaymentLabel }}
      </p>
      <div class="mt-4">
        <SaveSimulation placeholder="Ex : Appart Lyon - 20 ans" :save="onSave" />
      </div>

      <FundingBar class="mt-6" title="Total des mensualités" :total="totalPayments" :segments="costSegments">
        <template #after>
          <li v-if="applicationFees > 0" class="flex items-baseline justify-between gap-3 text-sm">
            <span class="text-ink-2 pl-[1.125rem]">Frais de dossier</span>
            <span class="figure text-ink">{{ formatCurrency(applicationFees) }}</span>
          </li>
          <li class="flex items-baseline justify-between gap-3 text-sm pt-2 mt-2 border-t border-line">
            <span class="flex items-center font-medium text-ink">
              Coût du crédit
              <InfoTooltip
                principe="Tout ce que le prêt coûte en plus du capital"
                :calcul="creditCostFormula"
              />
            </span>
            <span class="figure text-base text-ink">{{ formatCurrency(creditCost) }}</span>
          </li>
        </template>
      </FundingBar>
    </template>

    <template #below>
      <AmortizationTable v-if="isValid" :rows="amortizationTable" />
    </template>
  </CalculatorLayout>
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
  MAX_RATE
} from '../services/loanCalculator.js'
import { saveSimulation } from '../services/storageService.js'
import AmortizationTable from './AmortizationTable.vue'
import CalculatorLayout from './CalculatorLayout.vue'
import DurationField from './DurationField.vue'
import FormField from './FormField.vue'
import FundingBar from './FundingBar.vue'
import NumberInput from './NumberInput.vue'
import InfoTooltip from './InfoTooltip.vue'
import SaveSimulation from './SaveSimulation.vue'

// Préremplissage depuis l'historique, ou depuis « Simuler ce prêt » (Capacité, Projet)
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

watch(() => props.loadParams, (p) => {
  if (!p) return
  principal.value = p.principal ?? principal.value
  annualRate.value = p.annualRate ?? annualRate.value
  months.value = p.months ?? months.value
  // Une simulation de l'historique remplace tout (un champ absent est vidé).
  // « Simuler ce prêt » (merge) ne transmet que ce qu'il connaît : un champ transmis est repris tel quel,
  // même vide (Capacité sans assurance → pas d'assurance ici), un champ non transmis garde la saisie en cours.
  const loaded = (key, current) => (key in p ? p[key] : (p.merge ? current : null))
  insuranceRate.value = loaded('insuranceRate', insuranceRate.value)
  applicationFees.value = loaded('applicationFees', applicationFees.value)
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

// Ce qui sort du compte chaque mois : crédit + assurance
const monthlyTotal = computed(() =>
  Math.round((monthlyPayment.value + monthlyInsurance.value) * 100) / 100
)

const monthlyLabel = computed(() =>
  monthlyInsurance.value > 0 ? 'Mensualité, assurance comprise' : 'Mensualité'
)

const amortizationTable = computed(() =>
  generateAmortizationTable(principal.value, annualRate.value, months.value, startDate.value)
)

const totalInterest = computed(() =>
  Math.round(amortizationTable.value.reduce((sum, row) => sum + row.interestPart, 0) * 100) / 100
)

const totalInsurance = computed(() =>
  Math.round(monthlyInsurance.value * amortizationTable.value.length * 100) / 100
)

const totalPayments = computed(() =>
  Math.round((principal.value + totalInterest.value + totalInsurance.value) * 100) / 100
)

const creditCost = computed(() =>
  Math.round((totalInterest.value + totalInsurance.value + (applicationFees.value || 0)) * 100) / 100
)

const costSegments = computed(() => [
  { key: 'capital', label: 'Capital emprunté', value: principal.value || 0, color: 'capital' },
  { key: 'interest', label: 'Intérêts', value: totalInterest.value, color: 'interest', always: true },
  { key: 'insurance', label: 'Assurance', value: totalInsurance.value, color: 'insurance' }
])

const creditCostFormula = computed(() => {
  const parts = [`${formatCurrency(totalInterest.value)} d'intérêts`]
  if (totalInsurance.value > 0) parts.push(`${formatCurrency(totalInsurance.value)} d'assurance`)
  if (applicationFees.value > 0) parts.push(`${formatCurrency(applicationFees.value)} de frais de dossier`)
  return parts.join(' + ')
})

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
