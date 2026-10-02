<template>
  <CalculatorLayout
    title="Comparaison de deux prêts"
    :ready="bothValid"
    empty-hint="Renseignez le montant, le taux et la durée des deux scénarios pour les comparer."
  >
    <template #summary>
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-sm text-ink-2">{{ verdictLabel }}</span>
        <span v-if="bestIndex !== -1" class="figure text-lg text-ink">{{ formatCurrency(costGap) }}</span>
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

          <FormField v-slot="{ id }" label="Assurance" hint="(opt.)">
            <NumberInput :id="id" v-model="s.insuranceRate" :decimals="2" :max="MAX_RATE" suffix="%" placeholder="0,30" />
          </FormField>
        </fieldset>
      </div>
    </template>

    <template #result>
      <p class="text-sm text-ink-2">{{ verdictLabel }}</p>
      <p v-if="bestIndex !== -1" class="figure text-hero text-ink mt-1.5">{{ formatCurrency(costGap) }}</p>
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
              <!-- La meilleure valeur est marquée par une coche et une graisse, pas par une couleur seule -->
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
import { ref, computed } from 'vue'
import {
  calculateMonthlyPayment,
  calculateInsuranceCost,
  generateAmortizationTable,
  formatCurrency,
  formatDuration,
  MAX_RATE
} from '../services/loanCalculator.js'
import CalculatorLayout from './CalculatorLayout.vue'
import DurationField from './DurationField.vue'
import FormField from './FormField.vue'
import FundingBar from './FundingBar.vue'
import NumberInput from './NumberInput.vue'

// Un scénario par défaut pour faciliter la prise en main
const scenarios = ref([
  { principal: 200000, annualRate: 3.5, months: 240, insuranceRate: null },
  { principal: 200000, annualRate: 3.8, months: 300, insuranceRate: null }
])

function isValidScenario(s) {
  return s.principal > 0 && s.annualRate >= 0 && typeof s.annualRate === 'number' && s.months > 0
}

const bothValid = computed(() => scenarios.value.every(isValidScenario))

// Calculs pour chaque scénario
const results = computed(() => scenarios.value.map(s => {
  const monthlyLoan = calculateMonthlyPayment(s.principal, s.annualRate, s.months)
  const monthlyIns = calculateInsuranceCost(s.principal, s.insuranceRate)
  const table = generateAmortizationTable(s.principal, s.annualRate, s.months, new Date())
  const totalInterest = Math.round(table.reduce((sum, r) => sum + r.interestPart, 0) * 100) / 100
  const totalInsurance = Math.round(monthlyIns * s.months * 100) / 100
  return {
    monthlyTotal: Math.round((monthlyLoan + monthlyIns) * 100) / 100,
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
  const rows = [
    { label: hasInsurance ? 'Mensualité, assurance comprise' : 'Mensualité', raw: r.map(x => x.monthlyTotal), format: formatCurrency },
    { label: 'Durée', raw: scenarios.value.map(s => s.months), format: formatDuration },
    { label: 'Coût du crédit', raw: r.map(x => x.totalCost), format: formatCurrency }
  ]
  return rows.map(row => ({
    label: row.label,
    values: row.raw.map(row.format),
    betterIndex: lowestIndex(row.raw)
  }))
})
</script>
