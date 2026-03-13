<template>
  <input
    ref="inputRef"
    type="text"
    inputmode="decimal"
    :value="displayValue"
    :placeholder="placeholder"
    :class="inputClass"
    @input="onInput"
    @blur="onBlur"
  />
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: null },
  placeholder: { type: String, default: '' },
  inputClass: { type: String, default: 'input-field' },
  // Nombre de décimales autorisées (0 = entier uniquement)
  decimals: { type: Number, default: 0 }
})

const emit = defineEmits(['update:modelValue'])

const inputRef = ref(null)
const isFocused = ref(false)

// Formate un nombre avec des espaces comme séparateur de milliers (FR)
function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return ''
  const parts = value.toString().split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') // espace insécable
  return parts.join(',')
}

// Parse une chaîne en nombre, accepte espaces, virgule ou point
function parseInput(str) {
  if (!str) return null
  // Retire tous les espaces (normaux et insécables)
  const cleaned = str.replace(/[\s\u00A0]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

const displayValue = computed(() => formatNumber(props.modelValue))

function onInput(event) {
  const el = event.target
  const cursorPos = el.selectionStart
  const oldValue = el.value
  const oldLength = oldValue.length

  // Extraire la valeur numérique brute
  const raw = el.value
  const parsed = parseInput(raw)

  if (parsed !== null) {
    // Limite les décimales si nécessaire
    const rounded = props.decimals > 0
      ? Math.round(parsed * Math.pow(10, props.decimals)) / Math.pow(10, props.decimals)
      : Math.round(parsed)
    emit('update:modelValue', rounded)

    // Repositionner le curseur après le reformatage
    const formatted = formatNumber(rounded)
    const newLength = formatted.length
    const diff = newLength - oldLength

    requestAnimationFrame(() => {
      if (el === document.activeElement) {
        const newPos = Math.max(0, cursorPos + diff)
        el.setSelectionRange(newPos, newPos)
      }
    })
  } else if (raw === '' || raw === '-') {
    emit('update:modelValue', null)
  }
  // Si la saisie est invalide (lettres, etc.), on ne met pas à jour
}

function onBlur() {
  isFocused.value = false
}
</script>
