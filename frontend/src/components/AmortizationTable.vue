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

    <AmortizationChart :rows="rows" />

    <!-- Sur téléphone, le numéro et la mensualité (constante, déjà affichée en tête) sont masqués :
         les quatre colonnes utiles tiennent sans défilement horizontal. Chiffres condensés pour la même raison. -->
    <div class="overflow-x-auto border border-line rounded-xl bg-surface">
      <table class="amortization w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-ink-2 border-b border-line">
            <th scope="col" class="hidden sm:table-cell font-medium">N°</th>
            <th scope="col" class="font-medium">Date</th>
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
            <th scope="col" class="hidden sm:table-cell font-medium text-right">Mensualité</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.number"
            class="border-t border-line/60 first:border-t-0 hover:bg-sunken/60"
          >
            <td class="hidden sm:table-cell text-ink-3">{{ row.number }}</td>
            <td class="text-ink-2">{{ formatDate(row.date) }}</td>
            <td class="text-right text-ink">{{ formatCurrency(row.remainingPrincipal) }}</td>
            <td class="text-right text-ink">{{ formatCurrency(row.principalPart) }}</td>
            <td class="text-right text-ink">{{ formatCurrency(row.interestPart) }}</td>
            <td class="hidden sm:table-cell text-right text-ink font-medium">{{ formatCurrency(row.payment) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { formatCurrency, formatDate } from '../services/loanCalculator.js'
import AmortizationChart from './AmortizationChart.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] }
})

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
