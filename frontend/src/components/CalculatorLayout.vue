<template>
  <section>
    <h2 class="text-xl font-semibold text-ink">{{ title }}</h2>
    <p v-if="intro" class="mt-1 text-sm text-ink-2 max-w-prose">{{ intro }}</p>

    <!-- Bandeau de résultat (téléphone et tablette) : collé en haut, il reste visible au-dessus du clavier
         pendant la saisie. Sur grand écran la feuille de résultat est déjà à côté du formulaire. -->
    <div
      class="lg:hidden sticky z-10 -mx-4 mt-3 px-4 py-2.5 bg-bg/95 backdrop-blur border-y border-line top-[env(safe-area-inset-top)]"
      aria-live="polite"
    >
      <slot v-if="ready" name="summary" />
      <p v-else class="text-sm text-ink-3">{{ emptyHint }}</p>
    </div>

    <div class="mt-5 lg:mt-6 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-10 lg:items-start">
      <!-- Une colonne sur téléphone, deux sur tablette, une colonne étroite à côté du résultat sur grand écran -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <slot name="form" />
      </div>

      <div class="mt-6 lg:mt-0 lg:sticky lg:top-24">
        <div v-if="ready" class="sheet">
          <slot name="result" />
        </div>
        <!-- Écran vide : dire quoi saisir plutôt que ne rien afficher -->
        <div v-else class="hidden lg:block sheet text-sm text-ink-3">{{ emptyHint }}</div>
      </div>
    </div>

    <slot name="below" />
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  intro: { type: String, default: '' },
  // true quand la saisie permet un calcul
  ready: { type: Boolean, default: false },
  // Ce qu'il manque pour obtenir un résultat
  emptyHint: { type: String, default: '' }
})
</script>
