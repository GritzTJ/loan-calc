<template>
  <FormField v-slot="{ labelId }" class="sm:col-span-2 lg:col-span-1" label="Type de bien" group>
    <SegmentedControl
      :model-value="propertyType"
      :aria-labelledby="labelId"
      :options="PROPERTY_TYPES"
      @update:model-value="emit('update:propertyType', $event)"
    />
  </FormField>

  <!-- Les droits de mutation ne varient que dans l'ancien ; le neuf a un taux réduit unique -->
  <FormField v-if="propertyType === 'ancien'" class="sm:col-span-2 lg:col-span-1" label="Droits de mutation" group>
    <template #default="{ labelId }">
      <SegmentedControl
        :model-value="dmtoRate"
        :aria-labelledby="labelId"
        :options="DMTO_RATES"
        @update:model-value="emit('update:dmtoRate', $event)"
      />
    </template>
    <template #help>
      6,32 % dans la plupart des départements. 5,81 % pour un premier achat de résidence principale,
      ou si le département n'a pas voté la hausse. 5,09 % dans quelques départements.
    </template>
  </FormField>
</template>

<script setup>
import { PROPERTY_TYPES } from '../services/loanCalculator.js'
import { DMTO_RATES } from '../services/notaryFees.js'
import FormField from './FormField.vue'
import SegmentedControl from './SegmentedControl.vue'

// Ce qui détermine les frais de notaire : le type de bien et, dans l'ancien, le taux des droits de mutation
defineProps({
  propertyType: { type: String, default: 'ancien' },
  dmtoRate: { type: String, default: 'majore' }
})

const emit = defineEmits(['update:propertyType', 'update:dmtoRate'])
</script>
