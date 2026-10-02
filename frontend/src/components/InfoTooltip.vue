<template>
  <span
    ref="rootRef"
    class="relative inline-flex items-center ml-1 align-middle"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
    <button
      type="button"
      class="w-5 h-5 inline-flex items-center justify-center rounded-full border border-line-field text-ink-2 text-[11px] font-semibold leading-none select-none hover:bg-sunken"
      aria-label="Détail du calcul"
      :aria-expanded="visible"
      :aria-describedby="visible ? tooltipId : undefined"
      @click="toggle"
      @blur="hide"
      @keydown.esc="hide"
    >i</button>
    <span
      v-show="visible"
      :id="tooltipId"
      role="tooltip"
      class="tooltip-bubble absolute bottom-full left-1/2 mb-2 w-56 px-3 py-2 text-xs rounded-lg shadow-lg z-50 text-left font-normal"
      :style="{ transform: `translateX(calc(-50% + ${shift}px))` }"
    >
      <span class="block">{{ principe }}</span>
      <span class="block opacity-75 mt-0.5 tabular-nums">{{ calcul }}</span>
      <!-- La flèche reste sous le bouton même quand la bulle est recalée -->
      <span
        class="tooltip-arrow absolute top-full left-1/2"
        :style="{ transform: `translateX(calc(-50% - ${shift}px))` }"
      ></span>
    </span>
  </span>
</template>

<script setup>
import { ref, computed, useId, watch, onUnmounted } from 'vue'

defineProps({
  principe: String,
  calcul: String
})

const TOOLTIP_WIDTH = 224 // w-56
const VIEWPORT_MARGIN = 8

const tooltipId = useId()
const rootRef = ref(null)
// hovered : survol souris. pinned : ouvert par clic/tap/clavier (reste ouvert jusqu'à fermeture explicite).
const hovered = ref(false)
const pinned = ref(false)
const visible = computed(() => hovered.value || pinned.value)
// Décalage horizontal pour garder la bulle dans l'écran
const shift = ref(0)

// Seule la souris survole : au doigt, pointerenter précède le clic et annulerait le tap
function onPointerEnter(event) {
  if (event.pointerType === 'mouse') hovered.value = true
}
function onPointerLeave(event) {
  if (event.pointerType === 'mouse') hovered.value = false
}
function toggle() {
  pinned.value = !pinned.value
  if (!pinned.value) hovered.value = false
}
function hide() {
  pinned.value = false
  hovered.value = false
}

function onOutsidePointerDown(event) {
  if (!rootRef.value?.contains(event.target)) hide()
}

watch(visible, (isVisible) => {
  if (isVisible) {
    // Recale la bulle si, centrée sur le bouton, elle dépasserait d'un bord de l'écran
    const rect = rootRef.value.getBoundingClientRect()
    const center = rect.left + rect.width / 2
    const overflowLeft = VIEWPORT_MARGIN - (center - TOOLTIP_WIDTH / 2)
    const overflowRight = (center + TOOLTIP_WIDTH / 2) - (document.documentElement.clientWidth - VIEWPORT_MARGIN)
    shift.value = overflowLeft > 0 ? overflowLeft : overflowRight > 0 ? -overflowRight : 0
    document.addEventListener('pointerdown', onOutsidePointerDown)
  } else {
    document.removeEventListener('pointerdown', onOutsidePointerDown)
  }
})

onUnmounted(() => document.removeEventListener('pointerdown', onOutsidePointerDown))
</script>

<style>
/* Bulle inversée par rapport au thème : encre sur fond clair, fond clair sur encre */
.tooltip-bubble {
  background: rgb(var(--ink));
  color: rgb(var(--bg));
}
.tooltip-arrow {
  border: 4px solid transparent;
  border-top-color: rgb(var(--ink));
}
</style>
