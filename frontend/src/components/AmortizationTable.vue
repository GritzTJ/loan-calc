<template>
  <div v-if="rows.length" class="mt-10">
    <div class="flex items-center justify-between gap-3 mb-3">
      <h3 class="text-lg font-semibold text-ink">Tableau d'amortissement</h3>
      <button type="button" class="btn btn-secondary" :disabled="exporting" @click="onExport">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Exporter en Excel
      </button>
    </div>
    <p v-if="exportError" role="alert" class="notice notice-danger mb-3">
      Export impossible : le module Excel n'a pas pu être chargé. Vérifiez la connexion et réessayez.
    </p>

    <AmortizationChart :years="years" />

    <div class="flex items-center justify-between gap-3 mb-2">
      <p class="text-sm text-ink-2">Une ligne par année : touchez-la pour voir ses mensualités.</p>
      <button v-if="years.length > 1" type="button" class="btn btn-quiet h-9 px-3 -mr-3" @click="toggleAll">
        {{ allOpen ? 'Tout replier' : 'Tout déplier' }}
      </button>
    </div>

    <!-- Sur téléphone, l'assurance et le total sont masqués : les quatre colonnes utiles tiennent
         sans défilement horizontal. Chiffres condensés pour la même raison. -->
    <div class="overflow-x-auto border border-line rounded-xl bg-surface">
      <table class="amortization w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-ink-2 border-b border-line">
            <th scope="col" class="font-medium">Année</th>
            <th scope="col" class="font-medium text-right whitespace-nowrap">Restant dû</th>
            <th scope="col" class="font-medium text-right">
              <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span class="h-2 w-2 rounded-sm bg-capital" aria-hidden="true"></span>Capital
              </span>
            </th>
            <th scope="col" class="font-medium text-right">
              <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span class="h-2 w-2 rounded-sm bg-interest" aria-hidden="true"></span>Intérêts
              </span>
            </th>
            <th v-if="hasInsurance" scope="col" class="hidden sm:table-cell font-medium text-right">
              <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span class="h-2 w-2 rounded-sm bg-insurance" aria-hidden="true"></span>Assurance
              </span>
            </th>
            <th scope="col" class="hidden sm:table-cell font-medium text-right">Payé</th>
          </tr>
        </thead>
        <!-- Un <tbody> par année : la ligne de synthèse, puis ses mensualités une fois dépliée -->
        <tbody v-for="year in years" :key="year.year" class="border-t border-line/60 first:border-t-0">
          <tr class="cursor-pointer hover:bg-sunken/60" @click="toggle(year.year)">
            <th scope="row" class="text-left font-medium text-ink whitespace-nowrap">
              <button
                type="button"
                class="inline-flex items-center gap-1.5"
                :aria-expanded="isOpen(year.year)"
                :aria-label="`Année ${year.year}, ${isOpen(year.year) ? 'replier' : 'déplier'} les mensualités`"
                @click.stop="toggle(year.year)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-ink-3 transition-transform" :class="{ 'rotate-90': isOpen(year.year) }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                An {{ year.year }}
              </button>
            </th>
            <td class="text-right text-ink">{{ formatEuros(year.remainingPrincipal) }}</td>
            <td class="text-right text-ink">{{ formatEuros(year.principal) }}</td>
            <td class="text-right text-ink">{{ formatEuros(year.interest) }}</td>
            <td v-if="hasInsurance" class="hidden sm:table-cell text-right text-ink">{{ formatEuros(year.insurance) }}</td>
            <td class="hidden sm:table-cell text-right text-ink font-medium">{{ formatEuros(year.total) }}</td>
          </tr>
          <template v-if="isOpen(year.year)">
            <tr v-for="row in year.rows" :key="row.number" class="bg-sunken/40 text-[0.8125rem]">
              <td class="text-ink-2 pl-7">{{ formatDate(row.date) }}</td>
              <td class="text-right text-ink-2">{{ formatCurrency(row.remainingPrincipal) }}</td>
              <td class="text-right text-ink-2">{{ formatCurrency(row.principalPart) }}</td>
              <td class="text-right text-ink-2">{{ formatCurrency(row.interestPart) }}</td>
              <td v-if="hasInsurance" class="hidden sm:table-cell text-right text-ink-2">{{ formatCurrency(row.insurancePart) }}</td>
              <td class="hidden sm:table-cell text-right text-ink-2">{{ formatCurrency(row.totalPayment) }}</td>
            </tr>
            <!-- Remboursement anticipé versé après cette échéance : le restant dû de la ligne en tient déjà compte -->
            <tr v-for="row in year.rows.filter(r => r.extraPayment > 0)" :key="`extra-${row.number}`" class="bg-sunken/40 text-[0.8125rem]">
              <td :colspan="hasInsurance ? 6 : 5" class="text-ink pl-7 !whitespace-normal">
                Remboursement anticipé de <span class="figure">{{ formatEuros(row.extraPayment) }}</span> après l'échéance du {{ formatDate(row.date) }}<template v-if="row.penalty > 0">, indemnités de <span class="figure">{{ formatEuros(row.penalty) }}</span></template>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { formatCurrency, formatDate, formatEuros, summarizeByYear } from '../services/loanCalculator.js'
import AmortizationChart from './AmortizationChart.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] }
})

// Une ligne par année de prêt : 25 ans tiennent sur un écran, là où 300 mensualités demandaient 11 000 px
const years = computed(() => summarizeByYear(props.rows))
const hasInsurance = computed(() => props.rows.some(row => row.insurancePart > 0))

// Années dépliées. Un prêt d'un an ou moins n'a qu'une ligne : on montre directement ses mensualités.
const openYears = ref(new Set())
const isOpen = (year) => years.value.length === 1 || openYears.value.has(year)
const allOpen = computed(() => years.value.every(y => isOpen(y.year)))

function toggle(year) {
  const next = new Set(openYears.value)
  next.has(year) ? next.delete(year) : next.add(year)
  openYears.value = next
}

function toggleAll() {
  openYears.value = allOpen.value ? new Set() : new Set(years.value.map(y => y.year))
}

const exporting = ref(false)
const exportError = ref(false)

// La librairie Excel est lourde et rarement utilisée : elle n'est chargée qu'au clic
async function onExport() {
  exporting.value = true
  exportError.value = false
  try {
    const { exportAmortizationToXlsx } = await import('../services/excelExport.js')
    exportAmortizationToXlsx(props.rows)
  } catch {
    exportError.value = true
  } finally {
    exporting.value = false
  }
}
</script>

<style>
.amortization th,
.amortization td {
  padding: 0.5rem;
}
.amortization td {
  padding-block: 0.375rem;
  white-space: nowrap;
  font-stretch: 80%;
  font-variant-numeric: tabular-nums;
}
@media (min-width: 640px) {
  .amortization th,
  .amortization td {
    padding-inline: 0.75rem;
  }
}
</style>
