<template>
  <div>
    <div v-if="title" class="flex items-baseline justify-between gap-3 mb-1.5">
      <h4 class="text-sm font-medium text-ink">{{ title }}</h4>
      <span v-if="total !== null" class="figure text-base text-ink">{{ formatCurrency(total) }}</span>
    </div>

    <!-- La barre : chaque segment est proportionnel à son montant, sur l'échelle commune `scale` -->
    <div class="flex h-3" role="img" :aria-label="ariaLabel">
      <div
        v-for="(segment, index) in drawn"
        :key="segment.key"
        class="h-full min-w-[3px] transition-[width,opacity] duration-200"
        :class="[
          FILLS[segment.color],
          index > 0 ? 'ml-0.5' : '',
          index === 0 ? 'rounded-l' : '',
          index === drawn.length - 1 ? 'rounded-r' : '',
          activeKey && activeKey !== segment.key ? 'opacity-30' : ''
        ]"
        :style="{ width: `${segment.value / effectiveScale * 100}%` }"
        :title="`${segment.label} : ${formatCurrency(segment.value)}`"
        @pointerenter="activeKey = segment.key"
        @pointerleave="activeKey = null"
      ></div>
    </div>

    <!-- La légende porte tous les montants : rien n'est lisible uniquement par la couleur ou au survol -->
    <ul class="mt-3 space-y-1.5">
      <template v-for="(segment, index) in segments" :key="segment.key">
        <li
          v-if="segment.group && segment.group !== segments[index - 1]?.group"
          class="text-xs text-ink-3 pt-1.5 first:pt-0"
        >{{ segment.group }}</li>
        <li
          v-if="segment.value > 0 || segment.always"
          class="flex items-baseline justify-between gap-3 text-sm"
          @pointerenter="activeKey = segment.key"
          @pointerleave="activeKey = null"
        >
          <span class="flex items-center gap-2 min-w-0" :class="segment.color === 'gap' ? 'text-danger font-medium' : 'text-ink-2'">
            <!-- Un manque est un état, pas une série : icône + libellé, jamais la couleur seule -->
            <!-- Icône et pastille occupent la même largeur : les libellés restent alignés -->
            <svg v-if="segment.color === 'gap'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 -mx-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span v-else class="h-2.5 w-2.5 shrink-0 rounded-sm" :class="FILLS[segment.color]" aria-hidden="true"></span>
            <span>{{ segment.label }}</span>
            <slot :name="`info-${segment.key}`" />
          </span>
          <span class="figure" :class="segment.color === 'gap' ? 'text-danger' : 'text-ink'">{{ formatCurrency(segment.value) }}</span>
        </li>
      </template>
      <slot name="after" />
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { formatCurrency } from '../services/loanCalculator.js'

const props = defineProps({
  title: { type: String, default: '' },
  // Total affiché à droite du titre (null = pas de total)
  total: { type: Number, default: null },
  // [{ key, label, value, color, group?, always? }]
  //   color  : 'capital' | 'interest' | 'insurance' | 'apport' | 'gap'
  //   group  : intertitre de légende, affiché au premier segment du groupe
  //   always : garder la ligne de légende même à 0
  segments: { type: Array, required: true },
  // Montant qui correspond à 100 % de la largeur. Deux barres à comparer partagent la même échelle.
  scale: { type: Number, default: null }
})

// Une couleur par nature d'argent (voir tailwind.config.js). Le manque est hachuré : c'est un vide, pas un montant.
const FILLS = {
  capital: 'bg-capital',
  interest: 'bg-interest',
  insurance: 'bg-insurance',
  apport: 'bg-apport',
  gap: 'funding-gap'
}

// Survol d'un segment ou de sa ligne de légende : les autres segments s'estompent
const activeKey = ref(null)

const drawn = computed(() => props.segments.filter(segment => segment.value > 0))

const sum = computed(() => drawn.value.reduce((acc, segment) => acc + segment.value, 0))

// Sans échelle imposée, la barre occupe toute la largeur
const effectiveScale = computed(() => Math.max(props.scale || 0, sum.value) || 1)

const ariaLabel = computed(() =>
  drawn.value.map(segment => `${segment.label} ${formatCurrency(segment.value)}`).join(', ')
)
</script>

<style>
.funding-gap {
  background-image: repeating-linear-gradient(
    135deg,
    rgb(var(--danger)) 0 2px,
    rgb(var(--danger) / 0.15) 2px 6px
  );
}
</style>
