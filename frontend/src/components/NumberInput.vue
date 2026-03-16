<template>
  <input
    ref="inputRef"
    type="text"
    inputmode="decimal"
    :value="displayValue"
    :placeholder="placeholder"
    :class="inputClass"
    @focus="onFocus"
    @input="onInput"
    @blur="onBlur"
  />
</template>

<script setup>
import { ref, computed } from 'vue'

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
// Valeur brute affichée pendant la saisie (non reformatée)
const rawInput = ref('')

// Formate un nombre avec des espaces insécables comme séparateur de milliers
function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return ''
  const parts = value.toString().split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')
  if (parts[1]) return parts[0] + ',' + parts[1]
  return parts[0]
}

// Parse une chaîne en nombre : accepte espaces, virgule ou point décimal
function parseInput(str) {
  if (!str) return null
  const cleaned = str.replace(/[\s\u00A0]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

// Pendant le focus : affiche la saisie brute de l'utilisateur
// Hors focus : affiche le nombre formaté avec espaces
const displayValue = computed(() =>
  isFocused.value ? rawInput.value : formatNumber(props.modelValue)
)

function onFocus() {
  // Initialise la saisie brute avec la valeur actuelle (sans espaces, virgule comme séparateur)
  rawInput.value = props.modelValue !== null && props.modelValue !== undefined
    ? String(props.modelValue).replace('.', ',')
    : ''
  isFocused.value = true
}

function onInput(event) {
  rawInput.value = event.target.value
  const parsed = parseInput(event.target.value)

  if (parsed !== null) {
    const rounded = props.decimals > 0
      ? Math.round(parsed * Math.pow(10, props.decimals)) / Math.pow(10, props.decimals)
      : Math.round(parsed)
    emit('update:modelValue', rounded)
  } else if (event.target.value === '' || event.target.value === '-') {
    emit('update:modelValue', null)
  }
  // Si invalide (lettres...), on ne met pas à jour le modèle
}

function onBlur() {
  isFocused.value = false
  // displayValue basculera automatiquement vers le nombre formaté
}
</script>
