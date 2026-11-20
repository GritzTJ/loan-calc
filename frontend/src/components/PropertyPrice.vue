<template>
  <div class="mt-6 pt-6 border-t border-line">
    <p class="flex items-center text-sm text-ink-2">
      Prix du bien accessible
      <InfoTooltip v-if="result.maxPrice > 0 && !result.isApportConstrained" :principe="priceTooltip.principe" :calcul="priceTooltip.calcul" />
    </p>

    <!-- L'apport limite le prix : le chiffre utile est ce que la capacité d'emprunt permettrait,
         et l'apport qu'il faut pour y arriver. Le prix avec l'apport actuel vient ensuite. -->
    <template v-if="result.isApportConstrained">
      <p class="figure text-xl text-ink mt-1">{{ formatEuros(result.fullCapacityPrice) }}</p>
      <p class="text-sm text-ink-2">
        avec <span class="figure text-ink">{{ formatEuros(result.minApportNeeded) }}</span> d'apport, pour utiliser toute votre capacité d'emprunt
      </p>
      <p class="notice notice-warn mt-3">
        <template v-if="result.maxPrice > 0">
          Avec votre apport actuel de <strong class="figure">{{ formatEuros(personalContribution) }}</strong>,
          le prix est limité à <strong class="figure">{{ formatEuros(result.maxPrice) }}</strong>.
        </template>
        <template v-else>Sans apport, aucun achat n'est finançable.</template>
        Les frais de notaire ne peuvent pas être financés par le crédit.
      </p>
    </template>
    <template v-else>
      <p class="figure text-xl text-ink mt-1">{{ formatEuros(result.maxPrice) }}</p>
      <p v-if="result.feesExceedBudget" class="notice notice-warn mt-3">
        Les frais d'agence dépassent à eux seuls votre budget (capacité d'emprunt et apport).
      </p>
    </template>

    <!-- Plan de financement : les deux barres partagent la même échelle, ce que le prêt ne peut pas payer se lit à droite -->
    <template v-if="result.maxPrice > 0">
      <FundingBar class="mt-5" title="Besoins" :total="needs" :scale="scale" :segments="needSegments">
        <template #info-notary>
          <InfoTooltip
            principe="Frais d'acquisition non finançables par le crédit, calculés sur le prix hors frais d'agence"
            :calcul="`${formatEuros(result.maxPrice)} × ${notaryRateLabel}`"
          />
        </template>
      </FundingBar>
      <FundingBar class="mt-5" title="Ressources" :total="resources" :scale="scale" :segments="resourceSegments" />
      <p v-if="result.unusedCapacity > 0" class="mt-3 text-sm text-ink-2">
        Capacité d'emprunt non utilisée :
        <span class="figure text-ink">{{ formatEuros(result.unusedCapacity) }}</span>
      </p>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatEuros, formatPercent, NOTARY_FEES } from '../services/loanCalculator.js'
import FundingBar from './FundingBar.vue'
import InfoTooltip from './InfoTooltip.vue'

const props = defineProps({
  // Résultat de calculateMaxPropertyPrice
  result: { type: Object, required: true },
  // Saisies, pour détailler le calcul dans les tooltips
  borrowingCapacity: { type: Number, default: 0 },
  personalContribution: { type: Number, default: 0 },
  agencyFees: { type: Number, default: 0 },
  agencyFeesMode: { type: String, default: '€' },
  propertyType: { type: String, default: 'ancien' }
})

const notaryRateLabel = computed(() => formatPercent(NOTARY_FEES[props.propertyType] * 100))

const needs = computed(() =>
  Math.round((props.result.maxPrice + props.result.agencyFees + props.result.notaryFees) * 100) / 100
)

const resources = computed(() =>
  Math.round((props.result.loanUsed + props.personalContribution) * 100) / 100
)

const scale = computed(() => Math.max(needs.value, resources.value))

const needSegments = computed(() => [
  { key: 'price', label: 'Prix du bien', value: props.result.maxPrice, color: 'capital', group: 'Finançable par le prêt' },
  { key: 'agency', label: 'Frais d\'agence', value: props.result.agencyFees, color: 'capital', group: 'Finançable par le prêt' },
  { key: 'notary', label: `Frais de notaire (${notaryRateLabel.value})`, value: props.result.notaryFees, color: 'apport', group: 'À payer avec l\'apport' }
])

const resourceSegments = computed(() => [
  { key: 'loan', label: 'Prêt', value: props.result.loanUsed, color: 'capital' },
  { key: 'apport', label: 'Apport', value: props.personalContribution, color: 'apport', always: true }
])

// Tooltip "Prix du bien" : affiche la formule qui a déterminé le résultat
const priceTooltip = computed(() => {
  const r = props.result
  const isC2Binding = r.c2 <= r.c1

  if (isC2Binding) {
    return {
      principe: 'Limité par l\'apport (frais de notaire)',
      calcul: `${formatEuros(props.personalContribution)} ÷ ${notaryRateLabel.value} = ${formatEuros(r.maxPrice)}`
    }
  }

  const c1BaseLabel = `${formatEuros(props.borrowingCapacity)} + ${formatEuros(props.personalContribution)}`
  let diviseur
  if (props.agencyFeesMode === '%' && props.agencyFees) {
    diviseur = `(1 + ${notaryRateLabel.value} + ${formatPercent(props.agencyFees)})`
  } else {
    diviseur = `(1 + ${notaryRateLabel.value})`
  }
  const budgetDisplay = props.agencyFeesMode === '€' && props.agencyFees
    ? `(${c1BaseLabel} − ${formatEuros(props.agencyFees)})`
    : c1BaseLabel

  return {
    principe: 'Budget total ÷ frais inclusifs',
    calcul: `${budgetDisplay} ÷ ${diviseur} = ${formatEuros(r.maxPrice)}`
  }
})
</script>
