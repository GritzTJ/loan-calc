<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 class="text-lg font-bold text-gray-800">Simulateur Immobilier</h1>
        <!-- Navigation -->
        <nav class="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            @click="activeTab = 'simulator'"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === 'simulator'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'"
          >
            Simulateur
          </button>
          <button
            @click="activeTab = 'capacity'"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === 'capacity'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'"
          >
            Capacité
          </button>
        </nav>
      </div>
    </header>

    <!-- Contenu principal -->
    <main class="max-w-4xl mx-auto px-4 py-6">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <LoanSimulator v-if="activeTab === 'simulator'" />
        <BorrowingCapacity v-if="activeTab === 'capacity'" />
      </div>
    </main>

    <!-- Footer -->
    <footer class="max-w-4xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
      Simulateur de prêt immobilier — Usage personnel
      <!-- TODO v2: lien vers l'historique des simulations sauvegardées -->
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import LoanSimulator from './components/LoanSimulator.vue'
import BorrowingCapacity from './components/BorrowingCapacity.vue'

const activeTab = ref('simulator')
</script>

<style>
/* Classes utilitaires partagées pour les champs de saisie */
.input-field {
  @apply w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
         transition-colors;
}
</style>
