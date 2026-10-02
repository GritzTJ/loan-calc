<template>
  <div class="mt-6 border-t border-gray-200 dark:border-gray-700 pt-5">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Prix du bien accessible</h3>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField v-slot="{ id }" label="Apport personnel (€)">
        <NumberInput :id="id" v-model="personalContribution" placeholder="0" />
      </FormField>

      <FormField label="Frais d'agence" hint="(optionnel)">
        <template #aside>
          <SegmentedControl v-model="agencyFeesMode" size="sm" aria-label="Unité des frais d'agence" :options="AGENCY_FEES_MODES" />
        </template>
        <template #default="{ id }">
          <NumberInput :id="id" v-model="agencyFees" :decimals="2" placeholder="0" />
        </template>
      </FormField>

      <FormField v-slot="{ labelId }" class="sm:col-span-2" label="Type de bien" group>
        <SegmentedControl v-model="propertyType" class="mt-2" :aria-labelledby="labelId" :options="PROPERTY_TYPES" />
      </FormField>
    </div>

    <!-- L'apport limite le prix : on indique l'apport qui débloquerait toute la capacité d'emprunt -->
    <div v-if="borrowingCapacity > 0 && result.isApportConstrained" class="mt-5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-300">
      <template v-if="result.maxPrice > 0">Votre apport limite le prix du bien.</template>
      <template v-else>Les frais de notaire ne peuvent pas être financés par le crédit : il faut un apport.</template>
      Avec <strong>{{ formatCurrency(result.minApportNeeded) }}</strong> d'apport, vous utiliseriez toute votre capacité d'emprunt.
    </div>

    <!-- Résultats (masqués si le prix est 0 — apport trop faible pour tout financement) -->
    <div v-if="borrowingCapacity > 0 && result.maxPrice > 0" class="mt-5 grid grid-cols-1 gap-3" :class="result.agencyFees > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'">
      <div class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center transition-colors">
        <div class="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 uppercase">
          Prix max du bien
          <InfoTooltip
            :principe="priceTooltip.principe"
            :calcul="priceTooltip.calcul"
          />
        </div>
        <div class="text-xl font-bold text-green-700 dark:text-green-400">{{ formatCurrency(result.maxPrice) }}</div>
      </div>
      <div class="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-center transition-colors">
        <div class="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 uppercase">
          Frais de notaire
          <InfoTooltip
            principe="Frais d'acquisition non finançables par le crédit"
            :calcul="`${formatCurrency(result.maxPrice)} × ${notaryRateLabel}`"
          />
        </div>
        <div class="text-xl font-bold text-orange-600 dark:text-orange-400">{{ formatCurrency(result.notaryFees) }}</div>
      </div>
      <!-- Frais d'agence (affiché uniquement si renseigné) -->
      <div v-if="result.agencyFees > 0" class="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center transition-colors">
        <div class="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 uppercase">
          Frais d'agence
          <InfoTooltip
            v-if="agencyFeesMode === '%'"
            principe="Commission d'agence sur le prix max du bien"
            :calcul="`${formatCurrency(result.maxPrice)} × ${formatPercent(agencyFees)}`"
          />
        </div>
        <div class="text-xl font-bold text-purple-700 dark:text-purple-400">{{ formatCurrency(result.agencyFees) }}</div>
      </div>
      <div class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center transition-colors">
        <div class="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 uppercase">
          Budget total
          <InfoTooltip
            principe="Enveloppe totale disponible pour l'achat"
            :calcul="`${formatCurrency(borrowingCapacity)} + ${formatCurrency(personalContribution || 0)}`"
          />
        </div>
        <div class="text-xl font-bold text-blue-700 dark:text-blue-400">{{ formatCurrency(result.totalBudget) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  calculateMaxPropertyPrice,
  formatCurrency,
  formatPercent,
  NOTARY_FEES,
  AGENCY_FEES_MODES,
  PROPERTY_TYPES
} from '../services/loanCalculator.js'
import FormField from './FormField.vue'
import NumberInput from './NumberInput.vue'
import InfoTooltip from './InfoTooltip.vue'
import SegmentedControl from './SegmentedControl.vue'

const props = defineProps({
  borrowingCapacity: {
    type: Number,
    default: 0
  }
})

const personalContribution = ref(0)
const agencyFees = ref(null)
const agencyFeesMode = ref('€')
const propertyType = ref('ancien')

const notaryRateLabel = computed(() => formatPercent(NOTARY_FEES[propertyType.value] * 100))

const result = computed(() =>
  calculateMaxPropertyPrice(
    props.borrowingCapacity,
    personalContribution.value || 0,
    propertyType.value,
    agencyFees.value || 0,
    agencyFeesMode.value
  )
)

// Tooltip "Prix max du bien" : affiche la formule qui a déterminé le résultat
const priceTooltip = computed(() => {
  const r = result.value
  const isC2Binding = r.c2 <= r.c1

  if (isC2Binding) {
    return {
      principe: 'Limité par l\'apport (frais de notaire)',
      calcul: `${formatCurrency(personalContribution.value || 0)} ÷ ${notaryRateLabel.value} = ${formatCurrency(r.maxPrice)}`
    }
  }

  const c1BaseLabel = `${formatCurrency(props.borrowingCapacity)} + ${formatCurrency(personalContribution.value || 0)}`
  let diviseur
  if (agencyFeesMode.value === '%' && agencyFees.value) {
    diviseur = `(1 + ${notaryRateLabel.value} + ${formatPercent(agencyFees.value)})`
  } else {
    diviseur = `(1 + ${notaryRateLabel.value})`
  }
  const budgetDisplay = agencyFeesMode.value === '€' && agencyFees.value
    ? `(${c1BaseLabel} − ${formatCurrency(agencyFees.value)})`
    : c1BaseLabel

  return {
    principe: 'Budget total ÷ frais inclusifs',
    calcul: `${budgetDisplay} ÷ ${diviseur} = ${formatCurrency(r.maxPrice)}`
  }
})
</script>
