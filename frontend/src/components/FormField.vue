<template>
  <div>
    <div class="flex items-center justify-between gap-2 mb-1">
      <!-- Pour un groupe de boutons (group), le libellé est relié par aria-labelledby : un <label for> ne cible que les champs -->
      <component
        :is="group ? 'span' : 'label'"
        :id="labelId"
        :for="group ? undefined : id"
        class="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {{ label }}
        <span v-if="hint" class="font-normal text-gray-400 dark:text-gray-500">{{ hint }}</span>
      </component>
      <slot name="aside" />
    </div>
    <slot :id="id" :label-id="labelId" />
    <p v-if="$slots.help" class="text-xs text-gray-400 dark:text-gray-500 mt-1">
      <slot name="help" />
    </p>
  </div>
</template>

<script setup>
import { useId } from 'vue'

defineProps({
  label: { type: String, required: true },
  hint: { type: String, default: '' },
  group: { type: Boolean, default: false }
})

// Identifiants uniques : relient le libellé à son champ (clic sur le libellé, lecteurs d'écran)
const id = useId()
const labelId = `${id}-label`
</script>
