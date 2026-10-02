<template>
  <div class="min-h-screen">
    <!-- PWA iOS (viewport-fit=cover + barre d'état translucide) : le contenu défile sous l'encoche.
         Ce bandeau fixe, de la hauteur de la zone sûre, le masque. Hauteur nulle partout ailleurs. -->
    <div class="fixed top-0 inset-x-0 z-30 h-[env(safe-area-inset-top)] bg-bg" aria-hidden="true"></div>

    <!-- En-tête : collant avec les onglets sur grand écran, simple titre sur téléphone (les onglets sont en bas) -->
    <header class="z-20 bg-bg pt-[env(safe-area-inset-top)] lg:sticky lg:top-0 lg:border-b lg:border-line">
      <div class="max-w-5xl mx-auto px-4 h-14 flex items-center gap-8">
        <h1 class="text-base font-semibold text-ink">Prêt immobilier</h1>

        <nav class="hidden lg:flex self-stretch gap-1" aria-label="Onglets">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            :aria-current="activeTab === tab.id ? 'page' : undefined"
            class="px-3 text-sm border-b-2 -mb-px"
            :class="activeTab === tab.id
              ? 'border-primary-ink text-ink font-medium'
              : 'border-transparent text-ink-2 hover:text-ink'"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </nav>

        <button
          type="button"
          class="ml-auto h-11 w-11 -mr-2 inline-flex items-center justify-center rounded-lg text-ink-2 hover:bg-sunken hover:text-ink"
          :title="themeTitle"
          :aria-label="themeTitle"
          @click="toggleTheme"
        >
          <svg v-if="mode === 'light'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg v-else-if="mode === 'dark'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 pt-2 pb-10 lg:pt-8">
      <!-- KeepAlive : la saisie de chaque onglet est conservée quand on en change -->
      <KeepAlive>
        <LoanSimulator
          v-if="activeTab === 'simulator'"
          :load-params="loadParamsLoan"
        />
        <BorrowingCapacity
          v-else-if="activeTab === 'capacity'"
          :load-params="loadParamsCapacity"
          @simulate="onSimulate"
        />
        <LoanProject v-else-if="activeTab === 'project'" @simulate="onSimulate" />
        <LoanComparison v-else-if="activeTab === 'comparison'" />
        <SimulationHistory
          v-else-if="activeTab === 'history'"
          @load="onLoadSimulation"
        />
      </KeepAlive>
    </main>

    <!-- Le padding bas laisse la place à la barre d'onglets fixe sur téléphone -->
    <footer class="max-w-5xl mx-auto px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
      <span>Prêt immobilier v2.6.0, usage personnel</span>
      <span v-if="userName" class="flex items-center gap-2">
        <span>{{ userName }}</span>
        <a href="/auth/logout" class="underline hover:text-ink">Déconnexion</a>
      </span>
    </footer>

    <!-- Barre d'onglets (téléphone et tablette) : toujours visible, à portée de pouce -->
    <nav
      class="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-line pb-[env(safe-area-inset-bottom)]"
      aria-label="Onglets"
    >
      <div class="grid grid-cols-5 max-w-xl mx-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :aria-current="activeTab === tab.id ? 'page' : undefined"
          class="flex flex-col items-center justify-center gap-0.5 h-14 text-[0.6875rem] leading-none"
          :class="activeTab === tab.id ? 'text-primary-ink font-semibold' : 'text-ink-2'"
          @click="activeTab = tab.id"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" :stroke-width="activeTab === tab.id ? 2 : 1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon" />
          </svg>
          {{ tab.label }}
        </button>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import LoanSimulator from './components/LoanSimulator.vue'
import BorrowingCapacity from './components/BorrowingCapacity.vue'
import LoanComparison from './components/LoanComparison.vue'
import SimulationHistory from './components/SimulationHistory.vue'
import LoanProject from './components/LoanProject.vue'
import { useTheme } from './composables/useTheme.js'

// icon : tracé SVG (24×24, contour) de la barre d'onglets
const tabs = [
  { id: 'simulator', label: 'Simulateur', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id: 'capacity', label: 'Capacité', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { id: 'project', label: 'Projet', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'comparison', label: 'Comparer', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
  { id: 'history', label: 'Historique', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
]

// Lecture du paramètre ?tab=... (utilisé par les raccourcis PWA Android)
const initialTab = (() => {
  const param = new URLSearchParams(window.location.search).get('tab')
  return tabs.some(tab => tab.id === param) ? param : 'simulator'
})()
const activeTab = ref(initialTab)
const { mode, toggleTheme } = useTheme()
const userName = ref(null)

// Chaque onglet s'ouvre en haut de page (le défilement est commun à tous)
watch(activeTab, () => window.scrollTo({ top: 0 }))

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

// Params à injecter dans les composants (chargement depuis l'historique, « Simuler ce prêt »)
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

// « Simuler ce prêt » (Capacité, Projet) : ouvre le Simulateur avec le prêt calculé.
// merge : seuls les champs transmis sont remplacés, le reste de la saisie du Simulateur est conservé.
function onSimulate(params) {
  loadParamsLoan.value = { ...params, merge: true, _ts: Date.now() }
  activeTab.value = 'simulator'
}
</script>
