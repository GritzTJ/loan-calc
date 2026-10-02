<template>
  <button type="button" class="btn btn-secondary" @click="open">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path v-if="justSaved" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      <path v-else stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
    <span aria-live="polite">{{ justSaved ? 'Enregistré' : 'Enregistrer' }}</span>
  </button>

  <!-- <dialog> natif : piège le focus, se ferme avec Échap, gère le fond (::backdrop).
       Le padding est sur le formulaire : un clic dont la cible est le <dialog> lui-même est donc un clic sur le fond. -->
  <dialog
    ref="dialogRef"
    class="m-auto p-0 bg-surface text-ink rounded-2xl w-80 max-w-[calc(100vw-2rem)] shadow-xl backdrop:bg-black/50"
    :aria-labelledby="titleId"
    @click.self="close"
    @cancel="onCancel"
  >
    <form class="p-6" @submit.prevent="onSubmit">
      <h3 :id="titleId" class="text-lg font-semibold mb-4">Nommer la simulation</h3>
      <input
        v-model="name"
        type="text"
        class="input-field"
        :placeholder="placeholder"
        :maxlength="MAX_NAME_LENGTH"
        aria-label="Nom de la simulation"
        autofocus
      />
      <p v-if="error" role="alert" class="mt-2 text-sm text-danger">
        {{ error.message }}
        <a v-if="error.status === 401" href="/auth/login" class="underline">Se reconnecter</a>
      </p>
      <div class="flex gap-2 justify-end mt-5">
        <button type="button" class="btn btn-quiet" :disabled="saving" @click="close">Annuler</button>
        <button type="submit" class="btn btn-primary" :disabled="!name.trim() || saving">
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script setup>
import { ref, useId, onUnmounted } from 'vue'

const props = defineProps({
  placeholder: { type: String, default: '' },
  // Fonction async (name) => Promise : lève une erreur si l'enregistrement échoue
  save: { type: Function, required: true }
})

// Même limite que le backend (routes/simulations.js)
const MAX_NAME_LENGTH = 100
const SAVED_FEEDBACK_MS = 2500

const titleId = useId()
const dialogRef = ref(null)
const name = ref('')
const saving = ref(false)
const error = ref(null)
const justSaved = ref(false)
let savedTimer = null

function open() {
  error.value = null
  dialogRef.value.showModal()
}

// Pendant l'envoi, la modale ne se ferme pas (bouton, fond, Échap) : fermée, elle ne pourrait plus
// afficher un échec, et « annuler » un enregistrement déjà parti serait trompeur.
function close() {
  if (saving.value) return
  dialogRef.value.close()
}

// Échap sur un <dialog> déclenche `cancel` avant la fermeture
function onCancel(event) {
  if (saving.value) event.preventDefault()
}

async function onSubmit() {
  if (!name.value.trim() || saving.value) return
  saving.value = true
  error.value = null
  try {
    await props.save(name.value.trim())
    name.value = ''
    dialogRef.value.close()
    // Confirmation visible sur le bouton : la modale fermée ne suffit pas à dire que c'est enregistré
    justSaved.value = true
    clearTimeout(savedTimer)
    savedTimer = setTimeout(() => { justSaved.value = false }, SAVED_FEEDBACK_MS)
  } catch (err) {
    // La modale reste ouverte : le nom saisi n'est pas perdu
    error.value = err
  } finally {
    saving.value = false
  }
}

onUnmounted(() => clearTimeout(savedTimer))
</script>
