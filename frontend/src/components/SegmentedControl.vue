<template>
  <!-- Un seul bloc à fond creux, l'option active en relief : on lit un choix, pas une rangée de boutons -->
  <div role="group" class="inline-flex bg-sunken rounded-lg p-0.5" :class="{ 'w-full': size === 'md' }">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="modelValue === option.value"
      class="rounded-md font-medium transition-colors"
      :class="[
        size === 'sm' ? 'px-2.5 h-7 text-xs' : 'flex-1 px-3 h-10 text-sm',
        modelValue === option.value
          ? 'bg-surface text-ink shadow-sm'
          : 'text-ink-2 hover:text-ink'
      ]"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, required: true },
  // [{ value, label }]
  options: { type: Array, required: true },
  size: { type: String, default: 'md' } // 'md' | 'sm'
})

const emit = defineEmits(['update:modelValue'])
</script>
