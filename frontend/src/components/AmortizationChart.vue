<template>
  <div class="mb-6">
    <h4 class="text-sm font-medium text-ink mb-2">
      Ce que vous payez chaque année
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
  // Années du prêt (summarizeByYear)
  years: { type: Array, default: () => [] }
})

const { isDark } = useIsDark()

const hasInsurance = computed(() => props.years.some(y => y.insurance > 0))

// Chart.js dessine dans un canvas : il ne voit pas les classes Tailwind. On lit donc les jetons
// de couleur (main.css) au moment du rendu. La dépendance à isDark force la relecture au changement de thème.
const palette = computed(() => {
  isDark.value
  const styles = getComputedStyle(document.documentElement)
  const token = (name) => `rgb(${styles.getPropertyValue(`--${name}`).trim().replaceAll(' ', ', ')})`
  return {
    capital: token('capital'),
    interest: token('interest'),
    insurance: token('insurance'),
    surface: token('bg'),
    text: token('ink-2'),
    grid: token('line')
  }
})

const chartData = computed(() => {
  // Liseré couleur de fond : sépare les deux parts empilées et les barres voisines
  const bar = { borderColor: palette.value.surface, borderWidth: 1, borderRadius: 2 }
  const datasets = [
    { ...bar, label: 'Capital', data: props.years.map(y => y.principal), backgroundColor: palette.value.capital },
    { ...bar, label: 'Intérêts', data: props.years.map(y => y.interest), backgroundColor: palette.value.interest }
  ]
  if (hasInsurance.value) {
    datasets.push({ ...bar, label: 'Assurance', data: props.years.map(y => y.insurance), backgroundColor: palette.value.insurance })
  }
  return { labels: props.years.map(y => `An ${y.year}`), datasets }
})

const chartOptions = computed(() => {
  const font = { family: '"Archivo Variable", system-ui, sans-serif' }
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        labels: { color: palette.value.text, font, boxWidth: 10, boxHeight: 10 }
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
        ticks: { color: palette.value.text, font },
        grid: { display: false }
      },
      y: {
        stacked: true,
        ticks: {
          color: palette.value.text,
          font,
          // Axe en euros entiers : les centimes n'apportent rien à cette échelle
          callback: (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
        },
        grid: { color: palette.value.grid }
      }
    }
  }
})
</script>
