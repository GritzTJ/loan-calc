<template>
  <div v-if="rows.length" class="mt-6">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Tableau d'amortissement</h3>

    <!-- Résumé -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
      <div class="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center transition-colors">
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase">Coût total du crédit</div>
        <div class="text-lg font-bold text-blue-700 dark:text-blue-400">{{ formatCurrency(totalInterest) }}</div>
      </div>
      <div class="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center transition-colors">
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase">Total remboursé</div>
        <div class="text-lg font-bold text-green-700 dark:text-green-400">{{ formatCurrency(totalPaid) }}</div>
      </div>
      <div class="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 text-center sm:col-span-1 col-span-2 transition-colors">
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase">Durée</div>
        <div class="text-lg font-bold text-purple-700 dark:text-purple-400">{{ durationLabel }}</div>
      </div>
    </div>

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

const props = defineProps({
  rows: {
    type: Array,
    default: () => []
  }
})

const totalInterest = computed(() =>
  props.rows.reduce((sum, r) => sum + r.interestPart, 0)
)

const totalPaid = computed(() =>
  props.rows.reduce((sum, r) => sum + r.payment, 0)
)

const durationLabel = computed(() => {
  const months = props.rows.length
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem} mois`
  if (rem === 0) return `${years} an${years > 1 ? 's' : ''}`
  return `${years} an${years > 1 ? 's' : ''} et ${rem} mois`
})
</script>
