<template>
  <CalculatorLayout
    title="Capacité d'emprunt"
    :ready="isValid"
    empty-hint="Saisissez vos revenus ou une mensualité, une durée et un taux pour connaître votre capacité."
  >
    <template #summary>
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-sm text-ink-2">Capital empruntable</span>
        <span class="figure text-lg text-ink">{{ formatCurrency(capacity) }}</span>
      </div>
      <!-- Même condition que dans la feuille de résultat : pas de prix du bien sans capacité d'emprunt -->
      <div v-if="capacity > 0 && priceResult.maxPrice > 0" class="flex items-baseline justify-between gap-3">
        <span class="text-sm text-ink-2">Prix du bien accessible</span>
        <span class="figure text-base text-ink">{{ formatCurrency(priceResult.maxPrice) }}</span>
      </div>
    </template>

    <template #form>
      <SegmentedControl
        v-model="inputMode"
        class="sm:col-span-2 lg:col-span-1"
        aria-label="Mode de saisie"
        :options="INPUT_MODES"
      />

      <!-- Mode "Par revenus" -->
      <template v-if="inputMode === 'income'">
        <FormField v-slot="{ id }" label="Revenus nets mensuels">
          <NumberInput :id="id" v-model="monthlyIncome" suffix="€" placeholder="4 000" />
        </FormField>

        <FormField v-slot="{ id }" label="Charges mensuelles">
          <NumberInput :id="id" v-model="monthlyCharges" suffix="€" placeholder="500" />
        </FormField>

        <FormField v-slot="{ id }" label="Taux d'endettement cible">
          <NumberInput :id="id" v-model="debtRatio" :max="100" suffix="%" placeholder="35" />
        </FormField>
      </template>

      <!-- Mode "Mensualité connue" -->
      <FormField v-else v-slot="{ id }" label="Mensualité que je peux assumer">
        <NumberInput :id="id" v-model="directPayment" suffix="€" placeholder="1 200" />
      </FormField>

      <!-- Champs communs aux deux modes -->
      <DurationField v-model="months" label="Durée souhaitée" />

      <FormField v-slot="{ id }" label="Taux annuel">
        <NumberInput :id="id" v-model="annualRate" :decimals="2" :max="MAX_RATE" suffix="%" placeholder="3,50" />
      </FormField>

      <FormField v-slot="{ id }" label="Taux d'assurance" hint="(optionnel)">
        <NumberInput :id="id" v-model="insuranceRate" :decimals="2" :max="MAX_RATE" suffix="% / an" placeholder="0,30" />
      </FormField>

      <!-- Le bien visé : sert au calcul du prix accessible -->
      <h3 class="sm:col-span-2 lg:col-span-1 mt-2 pt-4 border-t border-line text-base font-semibold text-ink">Le bien visé</h3>

      <FormField v-slot="{ id }" label="Apport personnel">
        <NumberInput :id="id" v-model="personalContribution" suffix="€" placeholder="0" />
      </FormField>

      <FormField label="Frais d'agence" hint="(optionnel)">
        <template #aside>
          <SegmentedControl v-model="agencyFeesMode" size="sm" aria-label="Unité des frais d'agence" :options="AGENCY_FEES_MODES" />
        </template>
        <template #default="{ id }">
          <NumberInput :id="id" v-model="agencyFees" :decimals="2" :suffix="agencyFeesMode" placeholder="0" />
        </template>
      </FormField>

      <FormField v-slot="{ labelId }" class="sm:col-span-2 lg:col-span-1" label="Type de bien" group>
        <SegmentedControl v-model="propertyType" :aria-labelledby="labelId" :options="PROPERTY_TYPES" />
      </FormField>
    </template>

    <template #result>
      <p class="flex items-center text-sm text-ink-2">
        Capital empruntable
        <InfoTooltip
          principe="Formule inverse d'amortissement à taux fixe"
          :calcul="`${formatCurrency(maxPayment)} à ${formatPercent(annualRate)} sur ${months} mois`"
        />
      </p>
      <p class="figure text-hero text-ink mt-1.5">{{ formatCurrency(capacity) }}</p>

      <p class="mt-2 text-sm text-ink-2">
        <span class="inline-flex items-center">
          Pour <span class="figure text-ink mx-1">{{ formatCurrency(monthlyBudget) }}</span> par mois
          <InfoTooltip
            v-if="inputMode === 'income'"
            principe="Plafond d'endettement appliqué aux revenus"
            :calcul="`${formatCurrency(monthlyIncome)} × ${formatPercent(debtRatio)} − ${formatCurrency(monthlyCharges || 0)}`"
          />
        </span>
        <!-- Le budget mensuel se partage entre le crédit et l'assurance -->
        <template v-if="monthlyInsurance > 0">
          : <span class="figure text-ink">{{ formatCurrency(maxPayment) }}</span> de crédit
          et <span class="figure text-ink">{{ formatCurrency(monthlyInsurance) }}</span> d'assurance
        </template>
      </p>

      <p v-if="monthlyBudget <= 0" class="notice notice-danger mt-4">
        Vos charges dépassent la capacité d'endettement. Réduisez vos charges ou augmentez vos revenus.
      </p>

      <div class="flex flex-wrap gap-2 mt-4">
        <button v-if="capacity > 0" type="button" class="btn btn-primary" @click="onSimulate">Simuler ce prêt</button>
        <SaveSimulation placeholder="Ex : Capacité emprunt 2026" :save="onSave" />
      </div>

      <template v-if="capacity > 0">
        <PropertyPrice
          :result="priceResult"
          :borrowing-capacity="capacity"
          :personal-contribution="personalContribution || 0"
          :agency-fees="agencyFees || 0"
          :agency-fees-mode="agencyFeesMode"
          :property-type="propertyType"
        />
      </template>
    </template>
  </CalculatorLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  calculateMaxMonthlyPayment,
  calculateBorrowingCapacity,
  calculateInsuranceCost,
  calculateMaxPropertyPrice,
  formatCurrency,
  formatPercent,
  MAX_RATE,
  AGENCY_FEES_MODES,
  PROPERTY_TYPES
} from '../services/loanCalculator.js'
import { saveSimulation } from '../services/storageService.js'
import CalculatorLayout from './CalculatorLayout.vue'
import DurationField from './DurationField.vue'
import FormField from './FormField.vue'
import InfoTooltip from './InfoTooltip.vue'
import NumberInput from './NumberInput.vue'
import PropertyPrice from './PropertyPrice.vue'
import SaveSimulation from './SaveSimulation.vue'
import SegmentedControl from './SegmentedControl.vue'

// Chargement depuis l'historique
const props = defineProps({
  loadParams: { type: Object, default: null }
})

// simulate : envoie le prêt calculé vers l'onglet Simulateur
const emit = defineEmits(['simulate'])

const INPUT_MODES = [
  { value: 'income', label: 'Par revenus' },
  { value: 'payment', label: 'Mensualité connue' }
]

// Valeurs de départ de l'onglet
const DEFAULTS = {
  inputMode: 'income', // 'income' | 'payment'
  monthlyIncome: 4000,
  monthlyCharges: 0,
  debtRatio: 35,
  directPayment: null,
  months: 240,
  annualRate: 3.5
}

// --- State ---
const inputMode = ref(DEFAULTS.inputMode)

// Mode "Par revenus"
const monthlyIncome = ref(DEFAULTS.monthlyIncome)
const monthlyCharges = ref(DEFAULTS.monthlyCharges)
const debtRatio = ref(DEFAULTS.debtRatio)

// Mode "Mensualité connue"
const directPayment = ref(DEFAULTS.directPayment)

// Communs aux deux modes
const months = ref(DEFAULTS.months)
const annualRate = ref(DEFAULTS.annualRate)
const insuranceRate = ref(null)

// Le bien visé
const personalContribution = ref(0)
const agencyFees = ref(null)
const agencyFeesMode = ref('€')
const propertyType = ref('ancien')

// Une simulation de l'historique remplace toute la saisie. L'onglet reste en mémoire (KeepAlive) :
// un champ absent ou vide dans la simulation reprend la valeur de départ, jamais ce qui était saisi juste avant.
watch(() => props.loadParams, (p) => {
  if (!p) return
  inputMode.value = p.inputMode ?? DEFAULTS.inputMode // absent des simulations antérieures au mode « mensualité connue »
  monthlyIncome.value = p.monthlyIncome ?? DEFAULTS.monthlyIncome
  monthlyCharges.value = p.monthlyCharges ?? DEFAULTS.monthlyCharges
  debtRatio.value = p.debtRatio ?? DEFAULTS.debtRatio
  directPayment.value = p.directPayment ?? DEFAULTS.directPayment
  months.value = p.months ?? DEFAULTS.months
  annualRate.value = p.annualRate ?? DEFAULTS.annualRate
  insuranceRate.value = p.insuranceRate ?? null
  // Le bien visé n'est enregistré que depuis la v2.6.0 : une simulation plus ancienne ne le connaît pas
  // et garde donc celui en cours ; une simulation récente le restaure tel quel, champs vides compris.
  if ('personalContribution' in p) {
    personalContribution.value = p.personalContribution
    agencyFees.value = p.agencyFees ?? null
    agencyFeesMode.value = p.agencyFeesMode ?? '€'
    propertyType.value = p.propertyType ?? 'ancien'
  }
}, { immediate: true })

// --- Computed ---
const isValid = computed(() => {
  if (!(months.value > 0) || typeof annualRate.value !== 'number' || annualRate.value < 0) return false
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

const priceResult = computed(() =>
  calculateMaxPropertyPrice(
    capacity.value,
    personalContribution.value || 0,
    propertyType.value,
    agencyFees.value || 0,
    agencyFeesMode.value
  )
)

// --- Actions ---
function onSimulate() {
  emit('simulate', {
    principal: capacity.value,
    annualRate: annualRate.value,
    months: months.value,
    insuranceRate: insuranceRate.value
  })
}

// Lève une erreur en cas d'échec : SaveSimulation l'affiche et garde la modale ouverte
function onSave(name) {
  const params = {
    inputMode: inputMode.value,
    months: months.value,
    annualRate: annualRate.value,
    insuranceRate: insuranceRate.value,
    personalContribution: personalContribution.value,
    agencyFees: agencyFees.value,
    agencyFeesMode: agencyFeesMode.value,
    propertyType: propertyType.value
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
