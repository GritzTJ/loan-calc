<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors">
      <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 class="text-lg font-bold text-gray-800 dark:text-gray-100">Simulateur Immobilier</h1>
        <div class="flex items-center gap-3">
          <!-- Navigation -->
          <nav class="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              @click="activeTab = 'simulator'"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              :class="activeTab === 'simulator'
                ? 'bg-white dark:bg-gray-600 text-blue-700 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'"
            >
              Simulateur
            </button>
            <button
              @click="activeTab = 'capacity'"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              :class="activeTab === 'capacity'
                ? 'bg-white dark:bg-gray-600 text-blue-700 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'"
            >
              Capacité
            </button>
          </nav>
          <!-- Toggle thème -->
          <button
            @click="toggleTheme"
            class="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :title="themeTitle"
          >
            <!-- Soleil (mode clair) -->
            <svg v-if="mode === 'light'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <!-- Lune (mode sombre) -->
            <svg v-else-if="mode === 'dark'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <!-- Auto (mode système) -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Contenu principal -->
    <main class="max-w-4xl mx-auto px-4 py-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
        <LoanSimulator v-if="activeTab === 'simulator'" />
        <BorrowingCapacity v-if="activeTab === 'capacity'" />
      </div>
    </main>

    <!-- Footer -->
    <footer class="max-w-4xl mx-auto px-4 py-4 text-center text-xs text-gray-400 dark:text-gray-500">
      Simulateur de prêt immobilier — v1.2 — Usage personnel
      <!-- TODO v2: lien vers l'historique des simulations sauvegardées -->
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import LoanSimulator from './components/LoanSimulator.vue'
import BorrowingCapacity from './components/BorrowingCapacity.vue'
import { useTheme } from './composables/useTheme.js'

const activeTab = ref('simulator')
const { mode, toggleTheme } = useTheme()

const themeTitle = computed(() => {
  const labels = { system: 'Thème : auto', light: 'Thème : clair', dark: 'Thème : sombre' }
  return labels[mode.value]
})
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
