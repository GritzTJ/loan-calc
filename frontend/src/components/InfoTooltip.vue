<template>
  <span class="relative inline-flex items-center group ml-1 cursor-default align-middle">
    <span class="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-[9px] font-bold leading-none select-none">i</span>
    <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 text-xs bg-gray-800 dark:bg-gray-700 text-white rounded-lg shadow-xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity normal-case tracking-normal text-left font-normal">
      <span class="block text-gray-200">{{ principe }}</span>
      <span class="block text-gray-400 mt-0.5">{{ calcul }}</span>
      <span class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-700"></span>
    </span>
  </span>
</template>

<script setup>
defineProps({
  principe: String,
  calcul: String
})
</script>
