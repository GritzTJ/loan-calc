<template>
  <div class="mt-4 mb-6">
    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
      Répartition capital / intérêts
    </h4>
    <div class="h-64 sm:h-80">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import { useIsDark } from '../composables/useIsDark.js'
import { formatCurrency } from '../services/loanCalculator.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps({
  rows: { type: Array, default: () => [] }
})

const { isDark } = useIsDark()

// Seuil au-delà duquel on agrège par année
const MONTHLY_THRESHOLD = 120

const aggregatedData = computed(() => {
  if (props.rows.length <= MONTHLY_THRESHOLD) {
    return {
      labels: props.rows.map(r => `${r.number}`),
      principals: props.rows.map(r => r.principalPart),
      interests: props.rows.map(r => r.interestPart)
    }
  }

  // Agrégation par année
  const years = new Map()
  for (const row of props.rows) {
    const yearNum = Math.ceil(row.number / 12)
    if (!years.has(yearNum)) {
      years.set(yearNum, { principal: 0, interest: 0 })
    }
    const y = years.get(yearNum)
    y.principal += row.principalPart
    y.interest += row.interestPart
  }

  return {
    labels: [...years.keys()].map(y => `An ${y}`),
    principals: [...years.values()].map(y => Math.round(y.principal * 100) / 100),
    interests: [...years.values()].map(y => Math.round(y.interest * 100) / 100)
  }
})

const chartData = computed(() => ({
  labels: aggregatedData.value.labels,
  datasets: [
    {
      label: 'Part capital',
      data: aggregatedData.value.principals,
      backgroundColor: isDark.value ? 'rgba(74, 222, 128, 0.7)' : 'rgba(22, 163, 74, 0.7)'
    },
    {
      label: 'Part intérêts',
      data: aggregatedData.value.interests,
      backgroundColor: isDark.value ? 'rgba(248, 113, 113, 0.7)' : 'rgba(220, 38, 38, 0.7)'
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: isDark.value ? '#e5e7eb' : '#374151' }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: (ctx) => `${ctx.dataset.label} : ${formatCurrency(ctx.raw)}`
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      ticks: { color: isDark.value ? '#9ca3af' : '#6b7280' },
      grid: { color: isDark.value ? '#374151' : '#e5e7eb' }
    },
    y: {
      stacked: true,
      ticks: {
        color: isDark.value ? '#9ca3af' : '#6b7280',
        callback: (v) => formatCurrency(v)
      },
      grid: { color: isDark.value ? '#374151' : '#e5e7eb' }
    }
  }
}))
</script>
