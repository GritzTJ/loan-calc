<template>
  <FormField label="Assurance" :hint="compact ? '' : '(optionnel)'">
    <template #aside>
      <SegmentedControl
        :model-value="mode"
        size="sm"
        aria-label="Base de calcul de l'assurance"
        :options="compact ? COMPACT_MODES : INSURANCE_MODES"
        @update:model-value="emit('update:mode', $event)"
      />
    </template>
    <template #default="{ id }">
      <NumberInput
        :id="id"
        :model-value="rate"
        :decimals="2"
        :max="MAX_RATE"
        :suffix="compact ? '%' : '% / an'"
        placeholder="0,30"
        @update:model-value="emit('update:rate', $event)"
      />
    </template>
    <!-- Dit à quel contrat correspond le mode choisi : c'est ce que l'on sait en lisant une offre -->
    <template v-if="!compact" #help>
      {{ mode === 'crd'
        ? 'Sur le capital restant dû : cotisation dégressive (délégation d\'assurance).'
        : 'Sur le capital emprunté : cotisation fixe (contrat de la banque).' }}
    </template>
  </FormField>
</template>

<script setup>
import { INSURANCE_MODES, MAX_RATE } from '../services/loanCalculator.js'
import FormField from './FormField.vue'
import NumberInput from './NumberInput.vue'
import SegmentedControl from './SegmentedControl.vue'

// Taux d'assurance et base de calcul (capital initial ou restant dû), saisis ensemble dans trois onglets
defineProps({
  rate: { type: Number, default: null },
  mode: { type: String, default: 'initial' },
  // Version étroite pour les colonnes de la comparaison
  compact: { type: Boolean, default: false }
})

const emit = defineEmits(['update:rate', 'update:mode'])

const COMPACT_MODES = [
  { value: 'initial', label: 'initial' },
  { value: 'crd', label: 'CRD' }
]
</script>
