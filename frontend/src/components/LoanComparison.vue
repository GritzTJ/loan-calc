<template>
  <CalculatorLayout
    title="Comparaison de deux prêts"
    :ready="bothValid"
    empty-hint="Renseignez le montant, le taux et la durée des deux scénarios pour les comparer."
    resettable
    @reset="reset"
  >
    <template #summary>
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-sm text-ink-2">{{ verdictLabel }}</span>
        <span v-if="bestIndex !== -1" class="figure text-lg text-ink">{{ formatEuros(costGap) }}</span>
      </div>
    </template>

    <template #form>
      <!-- Les deux scénarios restent côte à côte, même sur téléphone : c'est une comparaison -->
      <div class="grid grid-cols-2 gap-x-4 sm:col-span-2 lg:col-span-1">
        <fieldset v-for="(s, i) in scenarios" :key="i" class="space-y-4 min-w-0">
          <legend class="text-base font-semibold text-ink mb-3">Scénario {{ i + 1 }}</legend>

          <FormField v-slot="{ id }" label="Montant">
            <NumberInput :id="id" v-model="s.principal" suffix="€" placeholder="200 000" />
          </FormField>

          <FormField v-slot="{ id }" label="Taux annuel">
            <NumberInput :id="id" v-model="s.annualRate" :decimals="2" :max="MAX_RATE" suffix="%" placeholder="3,50" />
          </FormField>

          <DurationField v-model="s.months" />

          <InsuranceField v-model:rate="s.insuranceRate" v-model:mode="s.insuranceMode" v-model:quota="s.insuranceQuota" compact />
        </fieldset>
      </div>
    </template>

    <template #result>
      <p class="text-sm text-ink-2">{{ verdictLabel }}</p>
      <p v-if="bestIndex !== -1" class="figure text-hero text-ink mt-1.5">{{ formatEuros(costGap) }}</p>
      <p v-if="monthlyNote" class="mt-2 text-sm text-ink-2">{{ monthlyNote }}</p>

      <!-- Même échelle pour les deux barres : la plus courte est le prêt qui coûte le moins au total -->
      <FundingBar
        v-for="(r, i) in results"
        :key="i"
        class="mt-6"
        :title="`Scénario ${i + 1}, total des mensualités`"
        :total="r.totalPaid"
        :scale="scale"
        :segments="r.segments"
      />

      <table class="w-full mt-6 text-sm">
        <thead>
          <tr class="text-xs text-ink-2 border-b border-line">
            <th scope="col" class="py-2 text-left font-medium"><span class="sr-only">Critère</span></th>
            <th scope="col" class="py-2 text-right font-medium">Scénario 1</th>
            <th scope="col" class="py-2 text-right font-medium">Scénario 2</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in comparisonRows" :key="row.label" class="border-b border-line/60 last:border-b-0">
            <th scope="row" class="py-2.5 pr-3 text-left font-normal text-ink-2">{{ row.label }}</th>
            <td
              v-for="(value, i) in row.values"
              :key="i"
              class="py-2.5 pl-3 text-right whitespace-nowrap text-ink"
              :class="row.betterIndex === i ? 'font-semibold' : ''"
            >
              <!-- La valeur la plus basse est marquée par une coche et une graisse, pas par une couleur seule.
                   Pas de coche sur la durée : plus court n'est pas « mieux », c'est un choix. -->
              <svg v-if="row.betterIndex === i" xmlns="http://www.w3.org/2000/svg" class="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-primary-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" role="img" aria-label="Le plus bas">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span class="tabular-nums">{{ value }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </CalculatorLayout>
</template>

<script setup>
import { computed, toRefs } from 'vue'
import {
  generateAmortizationTable,
  formatCurrency,
  formatEuros,
  formatDuration,
  MAX_RATE
} from '../services/loanCalculator.js'
import { usePersistedState } from '../composables/usePersistedState.js'
import CalculatorLayout from './CalculatorLayout.vue'
import DurationField from './DurationField.vue'
import FormField from './FormField.vue'
import FundingBar from './FundingBar.vue'
import InsuranceField from './InsuranceField.vue'
import NumberInput from './NumberInput.vue'

// Deux scénarios d'exemple pour la prise en main, puis saisie conservée d'une visite à l'autre
const { state, reset } = usePersistedState('comparison', {
  scenarios: [
    { principal: 200000, annualRate: 3.5, months: 240, insuranceRate: null, insuranceMode: 'initial', insuranceQuota: 100 },
    { principal: 200000, annualRate: 3.8, months: 300, insuranceRate: null, insuranceMode: 'initial', insuranceQuota: 100 }
  ]
})
const { scenarios } = toRefs(state)

function isValidScenario(s) {
  return s.principal > 0 && s.annualRate >= 0 && typeof s.annualRate === 'number' && s.months > 0
}

const bothValid = computed(() => scenarios.value.every(isValidScenario))

// Calculs pour chaque scénario
const results = computed(() => scenarios.value.map(s => {
  const table = generateAmortizationTable(s.principal, s.annualRate, s.months, new Date(), {
    insuranceRate: s.insuranceRate,
    insuranceMode: s.insuranceMode,
    insuranceQuota: s.insuranceQuota
  })
  const sum = (key) => Math.round(table.reduce((total, row) => total + row[key], 0) * 100) / 100
  const totalInterest = sum('interestPart')
  const totalInsurance = sum('insurancePart')
  return {
    // Première mensualité : la plus élevée quand l'assurance suit le capital restant dû
    monthlyTotal: table[0]?.totalPayment ?? 0,
    // Coût du crédit = ce qui est payé en plus du capital
    totalCost: Math.round((totalInterest + totalInsurance) * 100) / 100,
    totalPaid: Math.round(((s.principal || 0) + totalInterest + totalInsurance) * 100) / 100,
    segments: [
      { key: 'capital', label: 'Capital emprunté', value: s.principal || 0, color: 'capital' },
      { key: 'interest', label: 'Intérêts', value: totalInterest, color: 'interest', always: true },
      { key: 'insurance', label: 'Assurance', value: totalInsurance, color: 'insurance' }
    ]
  }
}))

const scale = computed(() => Math.max(...results.value.map(r => r.totalPaid)))

// Index de la valeur la plus basse d'une paire ; -1 en cas d'égalité
function lowestIndex([a, b]) {
  if (a === b) return -1
  return a < b ? 0 : 1
}

// Le scénario dont le coût du crédit est le plus bas
const bestIndex = computed(() =>
  bothValid.value ? lowestIndex(results.value.map(r => r.totalCost)) : -1
)

const costGap = computed(() =>
  Math.round(Math.abs(results.value[0].totalCost - results.value[1].totalCost) * 100) / 100
)

const verdictLabel = computed(() =>
  bestIndex.value === -1
    ? 'Les deux scénarios coûtent autant.'
    : `Le scénario ${bestIndex.value + 1} coûte moins cher de`
)

// Le prêt le moins cher a souvent la mensualité la plus lourde : on le dit
const monthlyNote = computed(() => {
  if (bestIndex.value === -1) return ''
  const best = results.value[bestIndex.value]
  const other = results.value[1 - bestIndex.value]
  const gap = Math.round(Math.abs(best.monthlyTotal - other.monthlyTotal) * 100) / 100
  if (gap === 0) return 'Les deux mensualités sont identiques.'
  const direction = best.monthlyTotal > other.monthlyTotal ? 'plus élevée' : 'plus basse'
  return `Sa mensualité est ${direction} de ${formatCurrency(gap)}.`
})

const comparisonRows = computed(() => {
  const r = results.value
  const hasInsurance = scenarios.value.some(s => s.insuranceRate)
  const decreasing = scenarios.value.some(s => s.insuranceRate && s.insuranceMode === 'crd')
  const monthlyLabel = decreasing ? 'Première mensualité' : (hasInsurance ? 'Mensualité, assurance comprise' : 'Mensualité')
  const rows = [
    { label: monthlyLabel, raw: r.map(x => x.monthlyTotal), format: formatCurrency, compare: true },
    { label: 'Durée', raw: scenarios.value.map(s => s.months), format: formatDuration, compare: false },
    { label: 'Coût du crédit', raw: r.map(x => x.totalCost), format: formatEuros, compare: true }
  ]
  return rows.map(row => ({
    label: row.label,
    values: row.raw.map(row.format),
    betterIndex: row.compare ? lowestIndex(row.raw) : -1
  }))
})
</script>
