<template>
  <button type="button" class="btn btn-secondary" :disabled="exporting" @click="onExport">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zm5-9v6m0 0l-2.5-2.5M12 18l2.5-2.5" />
    </svg>
    PDF
  </button>
  <p v-if="failed" role="alert" class="basis-full text-sm text-danger">
    Export impossible : le module PDF n'a pas pu être chargé. Vérifiez la connexion et réessayez.
  </p>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  // Fonction () => document à exporter (voir exportSummaryPdf)
  build: { type: Function, required: true }
})

const exporting = ref(false)
const failed = ref(false)

// La librairie PDF est lourde et rarement utilisée : elle n'est chargée qu'au clic
async function onExport() {
  exporting.value = true
  failed.value = false
  try {
    const { exportSummaryPdf } = await import('../services/pdfExport.js')
    exportSummaryPdf(props.build())
  } catch {
    failed.value = true
  } finally {
    exporting.value = false
  }
}
</script>
