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
  decimals: { type: Number, default: 0 },
  // Bornes : toute saisie hors bornes est ramenée à la borne (les montants, taux et durées sont positifs)
  min: { type: Number, default: 0 },
  max: { type: Number, default: null }
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
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  if (parts[1]) return parts[0] + ',' + parts[1]
  return parts[0]
}

// Parse une chaîne en nombre : accepte espaces, virgule ou point décimal
function parseInput(str) {
  if (!str) return null
  const cleaned = str.replace(/[\s ]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

// Saisie brute correspondant à un nombre (virgule comme séparateur décimal)
function toRawInput(value) {
  return String(value).replace('.', ',')
}

function clamp(value) {
  if (value < props.min) return props.min
  if (props.max !== null && value > props.max) return props.max
  return value
}

// Pendant le focus : affiche la saisie brute de l'utilisateur
// Hors focus : affiche le nombre formaté avec espaces
const displayValue = computed(() =>
  isFocused.value ? rawInput.value : formatNumber(props.modelValue)
)

function onFocus() {
  // La saisie brute part du texte déjà affiché (espaces compris, parseInput les ignore) :
  // réécrire la valeur au focus ferait sauter le curseur et perdre la sélection.
  rawInput.value = formatNumber(props.modelValue)
  isFocused.value = true
}

function onInput(event) {
  rawInput.value = event.target.value
  const parsed = parseInput(event.target.value)

  if (parsed !== null) {
    const rounded = props.decimals > 0
      ? Math.round(parsed * Math.pow(10, props.decimals)) / Math.pow(10, props.decimals)
      : Math.round(parsed)
    const clamped = clamp(rounded)
    // Hors bornes : le champ montre tout de suite la valeur retenue, pas celle tapée
    if (clamped !== rounded) rawInput.value = toRawInput(clamped)
    emit('update:modelValue', clamped)
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
