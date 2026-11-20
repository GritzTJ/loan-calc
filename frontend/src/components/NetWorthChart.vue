<template>
  <div class="h-64 sm:h-72">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'vue-chartjs'
import { useIsDark } from '../composables/useIsDark.js'
import { formatEuros } from '../services/loanCalculator.js'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps({
  // Années de compareRentAndBuy : [{ year, buy, rent }]
  years: { type: Array, default: () => [] }
})

const { isDark } = useIsDark()

// Chart.js dessine dans un canvas : il ne voit pas les classes Tailwind. On lit donc les jetons
// de couleur (main.css) au moment du rendu. La dépendance à isDark force la relecture au changement de thème.
const palette = computed(() => {
  isDark.value
  const styles = getComputedStyle(document.documentElement)
  const token = (name) => `rgb(${styles.getPropertyValue(`--${name}`).trim().replaceAll(' ', ', ')})`
  return { buy: token('capital'), rent: token('apport'), text: token('ink-2'), grid: token('line') }
})

const chartData = computed(() => {
  const line = { borderWidth: 2, pointRadius: 0, pointHitRadius: 12, tension: 0.2 }
  return {
    labels: props.years.map(y => `An ${y.year}`),
    datasets: [
      { ...line, label: 'En achetant', data: props.years.map(y => y.buy), borderColor: palette.value.buy, backgroundColor: palette.value.buy },
      // Trait pointillé : les deux courbes se distinguent aussi sans la couleur
      { ...line, label: 'En louant', data: props.years.map(y => y.rent), borderColor: palette.value.rent, backgroundColor: palette.value.rent, borderDash: [6, 4] }
    ]
  }
})

const chartOptions = computed(() => {
  const font = { family: '"Archivo Variable", system-ui, sans-serif' }
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        labels: { color: palette.value.text, font, boxWidth: 24, boxHeight: 0 }
      },
      tooltip: {
        callbacks: { label: (ctx) => `${ctx.dataset.label} : ${formatEuros(ctx.raw)}` }
      }
    },
    scales: {
      x: { ticks: { color: palette.value.text, font, maxTicksLimit: 8 }, grid: { display: false } },
      y: {
        ticks: { color: palette.value.text, font, callback: (v) => formatEuros(v) },
        grid: { color: palette.value.grid }
      }
    }
  }
})
</script>
