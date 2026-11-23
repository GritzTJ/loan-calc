<template>
  <FormField label="Assurance" :hint="compact ? '' : '(optionnel)'">
    <template v-if="!compact" #aside>
      <SegmentedControl
        :model-value="mode"
        size="sm"
        aria-label="Base de calcul de l'assurance"
        :options="INSURANCE_MODES"
        @update:model-value="emit('update:mode', $event)"
      />
    </template>
    <template #default="{ id }">
      <NumberInput
        :id="id"
        :model-value="rate"
        :decimals="3"
        :max="MAX_RATE"
        :suffix="compact ? '%' : '% / an'"
        placeholder="0,30"
        @update:model-value="emit('update:rate', $event)"
      />
      <!-- Colonne étroite (comparaison) : le choix passe sous le champ, il ne tient pas à côté du libellé -->
      <SegmentedControl
        v-if="compact"
        class="mt-2"
        :model-value="mode"
        size="sm"
        aria-label="Base de calcul de l'assurance"
        :options="COMPACT_MODES"
        @update:model-value="emit('update:mode', $event)"
      />
    </template>
    <!-- Dit à quel contrat correspond le mode choisi : c'est ce que l'on sait en lisant une offre -->
    <template v-if="!compact" #help>
      {{ mode === 'crd'
        ? 'Sur le capital restant dû : cotisation dégressive (délégation d\'assurance).'
        : 'Sur le capital emprunté : cotisation fixe (contrat de la banque).' }}
    </template>
  </FormField>

  <!-- Quotité : n'a de sens qu'avec une assurance, donc affichée seulement quand un taux est saisi -->
  <FormField v-if="rate > 0" v-slot="{ id }" :label="compact ? 'Quotité' : 'Quotité assurée'">
    <NumberInput
      :id="id"
      :model-value="quota"
      :min="1"
      :max="200"
      suffix="%"
      placeholder="100"
      @update:model-value="emit('update:quota', $event)"
    />
    <p v-if="!compact" class="text-xs text-ink-3 mt-1">
      100 % pour un emprunteur seul. À deux, la somme des deux parts : de 100 % (50/50) à 200 %.
    </p>
  </FormField>
</template>

<script setup>
import { INSURANCE_MODES, MAX_RATE } from '../services/loanCalculator.js'
import FormField from './FormField.vue'
import NumberInput from './NumberInput.vue'
import SegmentedControl from './SegmentedControl.vue'

// Assurance emprunteur : taux, base de calcul (capital initial ou restant dû) et quotité,
// saisis ensemble dans trois onglets
defineProps({
  rate: { type: Number, default: null },
  mode: { type: String, default: 'initial' },
  // Quotité assurée en % (null = 100)
  quota: { type: Number, default: null },
  // Version étroite pour les colonnes de la comparaison
  compact: { type: Boolean, default: false }
})

const emit = defineEmits(['update:rate', 'update:mode', 'update:quota'])

const COMPACT_MODES = [
  { value: 'initial', label: 'initial' },
  { value: 'crd', label: 'CRD' }
]
</script>
