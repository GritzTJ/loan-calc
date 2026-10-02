<template>
  <FormField :label="label">
    <template #aside>
      <SegmentedControl v-model="unit" size="sm" aria-label="Unité de durée" :options="UNITS" />
    </template>
    <template #default="{ id }">
      <NumberInput
        :id="id"
        :model-value="displayed"
        :max="unit === 'years' ? MAX_LOAN_MONTHS / 12 : MAX_LOAN_MONTHS"
        :suffix="unit === 'years' ? 'ans' : 'mois'"
        :placeholder="unit === 'years' ? '20' : '240'"
        @update:model-value="onInput"
      />
    </template>
    <!-- Rappel dans l'autre unité -->
    <template v-if="modelValue" #help>
      {{ unit === 'years' ? `${modelValue} mensualités` : formatDuration(modelValue) }}
    </template>
  </FormField>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { formatDuration, MAX_LOAN_MONTHS } from '../services/loanCalculator.js'
import FormField from './FormField.vue'
import NumberInput from './NumberInput.vue'
import SegmentedControl from './SegmentedControl.vue'

// Le modèle est toujours un nombre de mois ; l'unité n'est qu'une façon de le saisir
const props = defineProps({
  modelValue: { type: Number, default: null },
  label: { type: String, default: 'Durée' }
})

const emit = defineEmits(['update:modelValue'])

const UNITS = [
  { value: 'years', label: 'ans' },
  { value: 'months', label: 'mois' }
]

const isWholeYears = (months) => months === null || months % 12 === 0

// On raisonne en années par défaut ; une durée chargée qui ne tombe pas juste s'affiche en mois
const unit = ref(isWholeYears(props.modelValue) ? 'years' : 'months')

const displayed = computed(() => {
  if (props.modelValue === null) return null
  return unit.value === 'years' ? props.modelValue / 12 : props.modelValue
})

function onInput(value) {
  if (value === null) return emit('update:modelValue', null)
  emit('update:modelValue', unit.value === 'years' ? value * 12 : value)
}

// Durée modifiée de l'extérieur (historique, « Simuler ce prêt ») : repasser en mois si besoin
watch(() => props.modelValue, (months) => {
  if (unit.value === 'years' && !isWholeYears(months)) unit.value = 'months'
})

// Passage en années avec une durée qui ne tombe pas juste : on arrondit à l'année la plus proche
watch(unit, (newUnit) => {
  if (newUnit === 'years' && !isWholeYears(props.modelValue)) {
    emit('update:modelValue', Math.max(1, Math.round(props.modelValue / 12)) * 12)
  }
})
</script>
