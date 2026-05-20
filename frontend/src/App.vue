<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors">
      <div class="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center gap-y-2">
        <!-- Titre (flex-1 pour prendre l'espace disponible sur la 1re ligne) -->
        <h1 class="flex-1 text-lg font-bold text-gray-800 dark:text-gray-100">Simulateur Immobilier</h1>
        <!-- Toggle thème : order-2 sur mobile (reste sur la 1re ligne), order-3 sur sm+ -->
        <button
          @click="toggleTheme"
          class="order-2 sm:order-3 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          :title="themeTitle"
        >
          <svg v-if="mode === 'light'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg v-else-if="mode === 'dark'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
        <!-- Navigation : order-3 + w-full sur mobile (2e ligne), order-2 + w-auto sur sm+ (1re ligne) -->
        <nav class="order-3 sm:order-2 w-full sm:w-auto flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 pb-2 sm:pb-1">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="flex-1 sm:flex-none px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === tab.id
              ? 'bg-white dark:bg-gray-600 text-blue-700 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>
    </header>

    <!-- Contenu principal -->
    <main class="max-w-4xl mx-auto px-4 py-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
        <LoanSimulator
          v-if="activeTab === 'simulator'"
          :load-params="loadParamsLoan"
        />
        <BorrowingCapacity
          v-if="activeTab === 'capacity'"
          :load-params="loadParamsCapacity"
        />
        <LoanProject v-if="activeTab === 'project'" />
        <LoanComparison v-if="activeTab === 'comparison'" />
        <SimulationHistory
          v-if="activeTab === 'history'"
          @load="onLoadSimulation"
        />
      </div>
    </main>

    <!-- Bandeau de mise à jour PWA -->
    <div
      v-if="needRefresh"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg"
    >
      <span>Nouvelle version disponible</span>
      <button
        @click="applyUpdate"
        class="px-3 py-1 rounded-md bg-white text-blue-700 font-medium hover:bg-blue-50 transition-colors"
      >
        Recharger
      </button>
    </div>

    <!-- Footer -->
    <footer class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-center gap-4 text-xs text-gray-400 dark:text-gray-500">
      <span>Simulateur de prêt immobilier — v2.5.0 — Usage personnel</span>
      <span v-if="userName" class="flex items-center gap-2">
        <span>{{ userName }}</span>
        <a href="/auth/logout" class="underline hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Déconnexion</a>
      </span>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import LoanSimulator from './components/LoanSimulator.vue'
import BorrowingCapacity from './components/BorrowingCapacity.vue'
import LoanComparison from './components/LoanComparison.vue'
import SimulationHistory from './components/SimulationHistory.vue'
import LoanProject from './components/LoanProject.vue'
import { useTheme } from './composables/useTheme.js'
import { usePwaUpdate } from './composables/usePwaUpdate.js'

const tabs = [
  { id: 'simulator', label: 'Simulateur' },
  { id: 'capacity', label: 'Capacité' },
  { id: 'project', label: 'Projet' },
  { id: 'comparison', label: 'Comparer' },
  { id: 'history', label: 'Historique' }
]

const activeTab = ref('simulator')
const { mode, toggleTheme } = useTheme()
const { needRefresh, applyUpdate } = usePwaUpdate()
const userName = ref(null)

onMounted(async () => {
  try {
    const res = await fetch('/auth/me')
    if (res.ok) {
      const user = await res.json()
      userName.value = user.name
    } else if (res.status === 401) {
      // PWA installée : le SW peut servir l'index.html depuis le cache
      // alors que la session a expiré → on déclenche manuellement le login OIDC.
      window.location.href = '/auth/login'
    }
  } catch {
    // silencieux : si /auth/me échoue pour cause réseau, on n'affiche pas le nom
  }
})

// Params à injecter dans les composants lors d'un chargement depuis l'historique
const loadParamsLoan = ref(null)
const loadParamsCapacity = ref(null)

const themeTitle = computed(() => {
  const labels = { system: 'Thème : auto', light: 'Thème : clair', dark: 'Thème : sombre' }
  return labels[mode.value]
})

// Chargement depuis l'historique : bascule vers le bon onglet et injecte les params
function onLoadSimulation({ type, params }) {
  if (type === 'loan') {
    loadParamsLoan.value = { ...params, _ts: Date.now() } // _ts force la réactivité
    activeTab.value = 'simulator'
  } else {
    loadParamsCapacity.value = { ...params, _ts: Date.now() }
    activeTab.value = 'capacity'
  }
}
</script>

<style>
/* Classes utilitaires partagées pour les champs de saisie */
.input-field {
  @apply w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
         transition-colors
         dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100
         dark:placeholder-gray-400;
}
</style>
