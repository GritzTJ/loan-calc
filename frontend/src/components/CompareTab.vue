<template>
  <div>
    <!-- Deux comparaisons sous le même onglet : entre prêts, et entre louer et acheter -->
    <SegmentedControl v-model="mode" class="mb-5 max-w-md" aria-label="Type de comparaison" :options="MODES" />

    <!-- KeepAlive : chaque comparaison garde son état quand on passe à l'autre -->
    <KeepAlive>
      <LoanComparison v-if="mode === 'loans'" :add-loan="addLoan" />
      <RentVsBuy v-else />
    </KeepAlive>
  </div>
</template>

<script setup>
import { toRefs, watch } from 'vue'
import { usePersistedState } from '../composables/usePersistedState.js'
import LoanComparison from './LoanComparison.vue'
import RentVsBuy from './RentVsBuy.vue'
import SegmentedControl from './SegmentedControl.vue'

const props = defineProps({
  // Prêt de l'historique à ajouter à la comparaison de prêts
  addLoan: { type: Object, default: null }
})

const MODES = [
  { value: 'loans', label: 'Comparer des prêts' },
  { value: 'rent', label: 'Louer ou acheter' }
]

const { state } = usePersistedState('compare-mode', { mode: 'loans' })
const { mode } = toRefs(state)

// Un prêt envoyé depuis l'historique ouvre la comparaison de prêts
watch(() => props.addLoan, (loan) => { if (loan) mode.value = 'loans' }, { immediate: true })
</script>
