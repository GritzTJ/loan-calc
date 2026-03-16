<template>
  <div>
    <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Comparaison de scénarios</h2>

    <!-- Formulaire côte à côte -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div
        v-for="(s, i) in scenarios"
        :key="i"
        class="border rounded-xl p-4 transition-colors"
        :class="i === 0
          ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10'
          : 'border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/10'"
      >
        <h3
          class="text-sm font-semibold mb-3"
          :class="i === 0 ? 'text-blue-700 dark:text-blue-400' : 'text-purple-700 dark:text-purple-400'"
        >
          Scénario {{ i + 1 }}
        </h3>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Montant (€)</label>
            <NumberInput v-model="s.principal" placeholder="200 000" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Taux annuel (%)</label>
            <NumberInput v-model="s.annualRate" :decimals="2" placeholder="3,50" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Durée (mois)</label>
            <NumberInput v-model="s.months" placeholder="240" />
            <p v-if="s.months" class="text-xs text-gray-400 dark:text-gray-500 mt-1">
              = {{ Math.floor(s.months / 12) }} an{{ Math.floor(s.months / 12) > 1 ? 's' : '' }}
              <span v-if="s.months % 12"> et {{ s.months % 12 }} mois</span>
            </p>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Assurance (%/an) <span class="font-normal text-gray-400">(opt.)</span>
            </label>
            <NumberInput v-model="s.insuranceRate" :decimals="2" placeholder="0,30" />
          </div>
        </div>
      </div>
    </div>

    <!-- Tableau comparatif -->
    <div v-if="bothValid" class="mt-6 overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
            <th class="px-4 py-3 text-left">Critère</th>
            <th class="px-4 py-3 text-right" :class="bestIndex === 0 ? 'text-blue-700 dark:text-blue-400' : ''">
              Scénario 1 {{ bestIndex === 0 ? '✓' : '' }}
            </th>
            <th class="px-4 py-3 text-right" :class="bestIndex === 1 ? 'text-purple-700 dark:text-purple-400' : ''">
              Scénario 2 {{ bestIndex === 1 ? '✓' : '' }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in comparisonRows"
            :key="row.label"
            class="border-t border-gray-100 dark:border-gray-700"
            :class="row.highlight ? 'bg-gray-50 dark:bg-gray-700/30 font-semibold' : ''"
          >
            <td class="px-4 py-2.5 text-gray-600 dark:text-gray-400">{{ row.label }}</td>
            <td
              class="px-4 py-2.5 text-right"
              :class="row.betterIndex === 0 ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-gray-800 dark:text-gray-200'"
            >
              {{ row.values[0] }}
            </td>
            <td
              class="px-4 py-2.5 text-right"
              :class="row.betterIndex === 1 ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-gray-800 dark:text-gray-200'"
            >
              {{ row.values[1] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="bothValid" class="mt-2 text-xs text-gray-400 dark:text-gray-500 text-right">
      ✓ = meilleure valeur · vert = meilleur scénario pour ce critère
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  calculateMonthlyPayment,
  calculateInsuranceCost,
  generateAmortizationTable,
  formatCurrency
} from '../services/loanCalculator.js'
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
  const totalInterest = table.reduce((sum, r) => sum + r.interestPart, 0)
  const totalInsurance = Math.round(monthlyIns * s.months * 100) / 100
  return {
    monthlyLoan,
    monthlyIns,
    monthlyTotal: Math.round((monthlyLoan + monthlyIns) * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalInsurance,
    totalCost: Math.round((totalInterest + totalInsurance) * 100) / 100,
    totalPaid: Math.round((table.reduce((sum, r) => sum + r.payment, 0) + totalInsurance) * 100) / 100
  }
}))

// Le scénario avec le coût total (intérêts + assurance) le plus bas
const bestIndex = computed(() => {
  if (!bothValid.value) return -1
  return results.value[0].totalCost <= results.value[1].totalCost ? 0 : 1
})

function betterMin(i) {
  // Retourne l'index du scénario avec la valeur la plus basse pour l'item i
  const [a, b] = comparisonRows.value[i].rawValues
  if (a < b) return 0
  if (b < a) return 1
  return -1
}

const comparisonRows = computed(() => {
  const r = results.value
  const rows = [
    {
      label: 'Mensualité crédit',
      values: [formatCurrency(r[0].monthlyLoan), formatCurrency(r[1].monthlyLoan)],
      rawValues: [r[0].monthlyLoan, r[1].monthlyLoan]
    }
  ]

  // N'affiche l'assurance que si au moins un scénario en a
  if (scenarios.value.some(s => s.insuranceRate)) {
    rows.push({
      label: 'Mensualité assurance',
      values: [formatCurrency(r[0].monthlyIns), formatCurrency(r[1].monthlyIns)],
      rawValues: [r[0].monthlyIns, r[1].monthlyIns]
    })
    rows.push({
      label: 'Mensualité totale',
      values: [formatCurrency(r[0].monthlyTotal), formatCurrency(r[1].monthlyTotal)],
      rawValues: [r[0].monthlyTotal, r[1].monthlyTotal],
      highlight: true
    })
  } else {
    rows[0].highlight = true
  }

  rows.push({
    label: 'Total intérêts',
    values: [formatCurrency(r[0].totalInterest), formatCurrency(r[1].totalInterest)],
    rawValues: [r[0].totalInterest, r[1].totalInterest]
  })

  if (scenarios.value.some(s => s.insuranceRate)) {
    rows.push({
      label: 'Total assurance',
      values: [formatCurrency(r[0].totalInsurance), formatCurrency(r[1].totalInsurance)],
      rawValues: [r[0].totalInsurance, r[1].totalInsurance]
    })
  }

  rows.push({
    label: 'Coût total du crédit',
    values: [formatCurrency(r[0].totalCost), formatCurrency(r[1].totalCost)],
    rawValues: [r[0].totalCost, r[1].totalCost],
    highlight: !scenarios.value.some(s => s.insuranceRate)
  })

  rows.push({
    label: 'Total remboursé',
    values: [formatCurrency(r[0].totalPaid), formatCurrency(r[1].totalPaid)],
    rawValues: [r[0].totalPaid, r[1].totalPaid]
  })

  // Calcule betterIndex pour chaque ligne
  return rows.map(row => ({
    ...row,
    betterIndex: row.rawValues[0] < row.rawValues[1] ? 0
      : row.rawValues[1] < row.rawValues[0] ? 1
      : -1
  }))
})
</script>
