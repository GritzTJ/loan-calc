<template>
  <!-- <details> natif : repli au clavier et lecteurs d'écran sans code. Sert aux réglages secondaires
       d'un formulaire, pour que les champs essentiels restent en tête. -->
  <details class="group sm:col-span-2 lg:col-span-1 border-t border-line pt-1" :open="open">
    <summary class="flex items-center justify-between gap-3 py-2.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <span class="text-sm font-medium text-ink">{{ title }}</span>
      <span class="flex items-center gap-2 min-w-0">
        <!-- Résumé de ce qui est renseigné : on sait ce que la section contient sans l'ouvrir -->
        <span v-if="summary" class="text-xs text-ink-2 truncate">{{ summary }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-ink-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </summary>
    <div class="grid gap-4 pt-2 pb-3 sm:grid-cols-2 lg:grid-cols-1">
      <slot />
    </div>
  </details>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  // Texte court affiché à droite du titre (ex. « 1 500 € »)
  summary: { type: String, default: '' },
  // Ouverte au premier affichage (ex. quand elle contient déjà une saisie)
  open: { type: Boolean, default: false }
})
</script>
