<template>
  <div role="group" class="flex" :class="size === 'sm' ? 'gap-1' : 'gap-3'">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="modelValue === option.value"
      class="font-medium border transition-colors"
      :class="[
        size === 'sm' ? 'px-2 py-0.5 rounded text-xs' : 'flex-1 py-2 px-4 rounded-lg text-sm',
        modelValue === option.value
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
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
