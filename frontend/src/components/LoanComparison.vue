<template>
  <CalculatorLayout
    title="Comparaison de prêts"
    :ready="allValid"
    empty-hint="Renseignez le montant, le taux et la durée de chaque scénario pour les comparer."
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
      <!-- Les scénarios restent côte à côte, même sur téléphone : c'est une comparaison.
           Au-delà de deux, la rangée défile horizontalement. -->
      <div class="sm:col-span-2 lg:col-span-1 -mx-4 px-4 overflow-x-auto">
        <div class="grid gap-x-4" :style="{ gridTemplateColumns: `repeat(${scenarios.length}, minmax(${scenarios.length > 2 ? '10.5rem' : '0'}, 1fr))` }">
          <fieldset v-for="(s, i) in scenarios" :key="i" class="space-y-4 min-w-0">
            <legend class="flex items-center justify-between gap-1 w-full mb-3">
              <span class="min-w-0">
                <span class="block text-base font-semibold text-ink">Scénario {{ i + 1 }}</span>
                <!-- Nom de la simulation de l'historique dont le scénario provient -->
                <span v-if="s.name" class="block text-xs text-ink-2 truncate">{{ s.name }}</span>
              </span>
              <button
                v-if="scenarios.length > MIN_SCENARIOS"
                type="button"
                class="btn btn-quiet h-9 px-2 shrink-0"
                :aria-label="`Retirer le scénario ${i + 1}`"
                @click="remove(i)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </legend>

            <!-- Reprendre un prêt enregistré : la liste n'apparaît que s'il y en a -->
            <select
              v-if="savedLoans.length"
              class="input-field h-11 text-sm"
              :aria-label="`Charger un prêt enregistré dans le scénario ${i + 1}`"
              @change="onPick(i, $event)"
            >
              <option value="">Charger un prêt…</option>
              <option v-for="sim in savedLoans" :key="sim.id" :value="sim.id">{{ sim.name }}</option>
            </select>

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
      </div>

      <div v-if="scenarios.length < MAX_SCENARIOS" class="sm:col-span-2 lg:col-span-1">
        <button type="button" class="btn btn-secondary" @click="add">Ajouter un scénario</button>
      </div>
    </template>

    <template #result>
      <p class="text-sm text-ink-2">{{ verdictLabel }}</p>
      <p v-if="bestIndex !== -1" class="figure text-hero text-ink mt-1.5">{{ formatEuros(costGap) }}</p>
      <p v-if="monthlyNote" class="mt-2 text-sm text-ink-2">{{ monthlyNote }}</p>

      <!-- Même échelle pour toutes les barres : la plus courte est le prêt qui coûte le moins au total -->
      <FundingBar
        v-for="(r, i) in results"
        :key="i"
        class="mt-6"
        :title="`Scénario ${i + 1}, total des mensualités`"
        :total="r.totalPaid"
        :scale="scale"
        :segments="r.segments"
      />

      <div class="overflow-x-auto mt-6">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-ink-2 border-b border-line">
              <th scope="col" class="py-2 text-left font-medium"><span class="sr-only">Critère</span></th>
              <th v-for="(s, i) in scenarios" :key="i" scope="col" class="py-2 pl-3 text-right font-medium whitespace-nowrap">Scénario {{ i + 1 }}</th>
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
      </div>
    </template>
  </CalculatorLayout>
</template>

<script setup>
import { computed, onActivated, ref, toRefs, watch } from 'vue'
import {
  generateAmortizationTable,
  formatCurrency,
  formatEuros,
  formatDuration,
  sanitizeMonths,
  MAX_RATE
} from '../services/loanCalculator.js'
import { getSimulations } from '../services/storageService.js'
import { usePersistedState } from '../composables/usePersistedState.js'
import CalculatorLayout from './CalculatorLayout.vue'
import DurationField from './DurationField.vue'
import FormField from './FormField.vue'
import FundingBar from './FundingBar.vue'
import InsuranceField from './InsuranceField.vue'
import NumberInput from './NumberInput.vue'

const props = defineProps({
  // Prêt de l'historique à ajouter à la comparaison ({ name, params, _ts })
  addLoan: { type: Object, default: null }
})

const MIN_SCENARIOS = 2
const MAX_SCENARIOS = 4

const blank = (values = {}) => ({
  name: '', principal: 200000, annualRate: 3.5, months: 240, insuranceRate: null, insuranceMode: 'initial', insuranceQuota: 100, ...values
})

// Deux scénarios d'exemple pour la prise en main, puis saisie conservée d'une visite à l'autre
const { state, reset } = usePersistedState('comparison', {
  scenarios: [blank(), blank({ annualRate: 3.8, months: 300 })]
})
const { scenarios } = toRefs(state)

// Une liste conservée par une version antérieure peut être trop courte ou trop longue
if (scenarios.value.length < MIN_SCENARIOS || scenarios.value.length > MAX_SCENARIOS) reset()

function add() {
  // Le nouveau scénario part du dernier : on ne change en général qu'un paramètre
  scenarios.value = [...scenarios.value, { ...scenarios.value.at(-1), name: '' }]
}

function remove(index) {
  scenarios.value = scenarios.value.filter((_, i) => i !== index)
}

// --- Prêts enregistrés ---
// Seul le prêt principal d'une simulation est repris : montant, taux, durée, assurance
function fromSaved(sim) {
  const p = sim.params ?? {}
  return blank({
    name: sim.name ?? '',
    principal: typeof p.principal === 'number' ? p.principal : null,
    annualRate: typeof p.annualRate === 'number' ? p.annualRate : null,
    months: sanitizeMonths(p.months),
    insuranceRate: typeof p.insuranceRate === 'number' ? p.insuranceRate : null,
    insuranceMode: p.insuranceMode === 'crd' ? 'crd' : 'initial',
    insuranceQuota: typeof p.insuranceQuota === 'number' ? p.insuranceQuota : 100
  })
}

const savedLoans = ref([])
// La liste sert de raccourci : si elle ne se charge pas, la comparaison reste utilisable à la main
onActivated(async () => {
  try {
    savedLoans.value = (await getSimulations()).filter(sim => sim.type === 'loan')
  } catch {
    savedLoans.value = []
  }
})

function onPick(index, event) {
  const sim = savedLoans.value.find(s => String(s.id) === event.target.value)
  if (sim) scenarios.value = scenarios.value.map((s, i) => (i === index ? fromSaved(sim) : s))
  event.target.value = ''
}

// « Comparer » depuis l'historique : le prêt s'ajoute, ou remplace le dernier scénario si la comparaison est pleine
watch(() => props.addLoan, (sim) => {
  if (!sim) return
  const scenario = fromSaved(sim)
  scenarios.value = scenarios.value.length < MAX_SCENARIOS
    ? [...scenarios.value, scenario]
    : [...scenarios.value.slice(0, -1), scenario]
}, { immediate: true })

// --- Calculs ---
function isValidScenario(s) {
  return s.principal > 0 && s.annualRate >= 0 && typeof s.annualRate === 'number' && s.months > 0
}

const allValid = computed(() => scenarios.value.every(isValidScenario))

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

// Index de la valeur la plus basse ; -1 si elle est partagée par plusieurs scénarios
function lowestIndex(values) {
  const min = Math.min(...values)
  return values.filter(v => v === min).length === 1 ? values.indexOf(min) : -1
}

// Le scénario dont le coût du crédit est le plus bas
const bestIndex = computed(() =>
  allValid.value ? lowestIndex(results.value.map(r => r.totalCost)) : -1
)

// Écart avec le deuxième scénario le moins cher
const costGap = computed(() => {
  const costs = results.value.map(r => r.totalCost).sort((a, b) => a - b)
  return Math.round((costs[1] - costs[0]) * 100) / 100
})

const verdictLabel = computed(() => {
  if (bestIndex.value === -1) return 'Les scénarios les moins chers coûtent autant.'
  return scenarios.value.length === 2
    ? `Le scénario ${bestIndex.value + 1} coûte moins cher de`
    : `Le scénario ${bestIndex.value + 1} est le moins cher, de`
})

// Le prêt le moins cher a souvent la mensualité la plus lourde : on le dit
const monthlyNote = computed(() => {
  if (bestIndex.value === -1) return ''
  const best = results.value[bestIndex.value].monthlyTotal
  const others = results.value.filter((_, i) => i !== bestIndex.value).map(r => r.monthlyTotal)
  if (others.every(m => m === best)) return 'Les mensualités sont identiques.'
  if (scenarios.value.length > 2) {
    if (best > Math.max(...others)) return 'Sa mensualité est la plus élevée.'
    if (best < Math.min(...others)) return 'Sa mensualité est aussi la plus basse.'
    return ''
  }
  const gap = Math.round(Math.abs(best - others[0]) * 100) / 100
  return `Sa mensualité est ${best > others[0] ? 'plus élevée' : 'plus basse'} de ${formatCurrency(gap)}.`
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
