<template>
  <div v-if="rows.length" class="mt-6">
    <!-- Header avec titre et bouton export -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Tableau d'amortissement</h3>
      <button
        @click="onExport"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
               text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30
               border border-green-200 dark:border-green-800 rounded-lg
               hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Exporter Excel
      </button>
    </div>

    <!-- Résumé -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
      <div class="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center transition-colors">
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase">
          {{ monthlyInsurance > 0 ? 'Coût intérêts' : 'Coût total du crédit' }}
        </div>
        <div class="text-lg font-bold text-blue-700 dark:text-blue-400">{{ formatCurrency(totalInterest) }}</div>
      </div>
      <!-- Coût assurance (si applicable) -->
      <div v-if="monthlyInsurance > 0" class="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 text-center transition-colors">
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase">Coût assurance</div>
        <div class="text-lg font-bold text-orange-600 dark:text-orange-400">{{ formatCurrency(totalInsurance) }}</div>
      </div>
      <div class="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center transition-colors">
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase">Total remboursé</div>
        <div class="text-lg font-bold text-green-700 dark:text-green-400">{{ formatCurrency(totalPaid + totalInsurance) }}</div>
      </div>
      <div
        class="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 text-center transition-colors"
        :class="monthlyInsurance > 0 ? 'sm:col-span-1 col-span-2' : 'sm:col-span-1 col-span-2'"
      >
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase">Durée</div>
        <div class="text-lg font-bold text-purple-700 dark:text-purple-400">{{ durationLabel }}</div>
      </div>
    </div>

    <!-- Graphique -->
    <AmortizationChart :rows="rows" />

    <!-- Tableau -->
    <div class="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
            <th class="px-3 py-2 text-center">N°</th>
            <th class="px-3 py-2 text-center">Date</th>
            <th class="px-3 py-2 text-right">Capital restant dû</th>
            <th class="px-3 py-2 text-right">Part capital</th>
            <th class="px-3 py-2 text-right">Part intérêts</th>
            <th class="px-3 py-2 text-right">Mensualité</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.number"
            class="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            :class="{
              'bg-yellow-50 dark:bg-yellow-900/20': row.number === 1 || row.number === rows.length
            }"
          >
            <td class="px-3 py-1.5 text-center text-gray-500 dark:text-gray-400">{{ row.number }}</td>
            <td class="px-3 py-1.5 text-center text-gray-800 dark:text-gray-200">{{ formatDate(row.date) }}</td>
            <td class="px-3 py-1.5 text-right font-mono text-gray-800 dark:text-gray-200">{{ formatCurrency(row.remainingPrincipal) }}</td>
            <td class="px-3 py-1.5 text-right font-mono text-green-700 dark:text-green-400">{{ formatCurrency(row.principalPart) }}</td>
            <td class="px-3 py-1.5 text-right font-mono text-red-600 dark:text-red-400">{{ formatCurrency(row.interestPart) }}</td>
            <td class="px-3 py-1.5 text-right font-mono font-semibold text-gray-800 dark:text-gray-200">{{ formatCurrency(row.payment) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency, formatDate } from '../services/loanCalculator.js'
import { exportAmortizationToXlsx } from '../services/excelExport.js'
import AmortizationChart from './AmortizationChart.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  monthlyInsurance: { type: Number, default: 0 }
})

const totalInterest = computed(() =>
  props.rows.reduce((sum, r) => sum + r.interestPart, 0)
)

const totalPaid = computed(() =>
  props.rows.reduce((sum, r) => sum + r.payment, 0)
)

const totalInsurance = computed(() =>
  Math.round(props.monthlyInsurance * props.rows.length * 100) / 100
)

const durationLabel = computed(() => {
  const months = props.rows.length
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem} mois`
  if (rem === 0) return `${years} an${years > 1 ? 's' : ''}`
  return `${years} an${years > 1 ? 's' : ''} et ${rem} mois`
})

function onExport() {
  exportAmortizationToXlsx(props.rows)
}
</script>
