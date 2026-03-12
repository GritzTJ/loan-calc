<template>
  <div v-if="rows.length" class="mt-6">
    <h3 class="text-lg font-semibold text-gray-800 mb-3">Tableau d'amortissement</h3>

    <!-- Résumé -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
      <div class="bg-blue-50 rounded-lg p-3 text-center">
        <div class="text-xs text-gray-500 uppercase">Coût total du crédit</div>
        <div class="text-lg font-bold text-blue-700">{{ formatCurrency(totalInterest) }}</div>
      </div>
      <div class="bg-green-50 rounded-lg p-3 text-center">
        <div class="text-xs text-gray-500 uppercase">Total remboursé</div>
        <div class="text-lg font-bold text-green-700">{{ formatCurrency(totalPaid) }}</div>
      </div>
      <div class="bg-purple-50 rounded-lg p-3 text-center sm:col-span-1 col-span-2">
        <div class="text-xs text-gray-500 uppercase">Durée</div>
        <div class="text-lg font-bold text-purple-700">{{ durationLabel }}</div>
      </div>
    </div>

    <!-- Tableau -->
    <div class="overflow-x-auto border border-gray-200 rounded-lg">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-100 text-gray-600 text-xs uppercase">
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
            class="border-t border-gray-100 hover:bg-gray-50"
            :class="{ 'bg-yellow-50': row.number === 1 || row.number === rows.length }"
          >
            <td class="px-3 py-1.5 text-center text-gray-500">{{ row.number }}</td>
            <td class="px-3 py-1.5 text-center">{{ formatDate(row.date) }}</td>
            <td class="px-3 py-1.5 text-right font-mono">{{ formatCurrency(row.remainingPrincipal) }}</td>
            <td class="px-3 py-1.5 text-right font-mono text-green-700">{{ formatCurrency(row.principalPart) }}</td>
            <td class="px-3 py-1.5 text-right font-mono text-red-600">{{ formatCurrency(row.interestPart) }}</td>
            <td class="px-3 py-1.5 text-right font-mono font-semibold">{{ formatCurrency(row.payment) }}</td>
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
