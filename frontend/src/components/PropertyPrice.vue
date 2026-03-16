<template>
  <div class="mt-6 border-t border-gray-200 dark:border-gray-700 pt-5">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Prix du bien accessible</h3>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Apport personnel -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Apport personnel (€)</label>
        <NumberInput
          v-model="personalContribution"
          placeholder="0"
        />
      </div>

      <!-- Frais d'agence -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Frais d'agence
            <span class="font-normal text-gray-400 dark:text-gray-500">(optionnel)</span>
          </label>
          <!-- Toggle €/% -->
          <div class="flex gap-1">
            <button
              @click="agencyFeesMode = '€'"
              class="px-2 py-0.5 rounded text-xs font-medium border transition-colors"
              :class="agencyFeesMode === '€'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'"
            >€ fixe</button>
            <button
              @click="agencyFeesMode = '%'"
              class="px-2 py-0.5 rounded text-xs font-medium border transition-colors"
              :class="agencyFeesMode === '%'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'"
            >% du prix</button>
          </div>
        </div>
        <NumberInput
          v-model="agencyFees"
          :decimals="2"
          placeholder="0"
        />
      </div>

      <!-- Type de bien -->
      <div class="sm:col-span-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de bien</label>
        <div class="flex gap-3 mt-2">
          <button
            @click="propertyType = 'ancien'"
            class="flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors"
            :class="propertyType === 'ancien'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'"
          >
            Ancien (8%)
          </button>
          <button
            @click="propertyType = 'neuf'"
            class="flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors"
            :class="propertyType === 'neuf'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'"
          >
            Neuf (3%)
          </button>
        </div>
      </div>
    </div>

    <!-- Avertissement apport insuffisant -->
    <div v-if="borrowingCapacity > 0 && result.isApportConstrained" class="mt-5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-300">
      Apport insuffisant pour couvrir les frais d'acquisition. Il faut au moins
      <strong>{{ formatCurrency(result.minApportNeeded) }}</strong> d'apport.
    </div>

    <!-- Résultats (masqués si le prix est 0 — apport trop faible pour tout financement) -->
    <div v-if="borrowingCapacity > 0 && result.maxPrice > 0" class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3" :class="result.agencyFees > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'">
      <div class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center transition-colors">
        <div class="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 uppercase">
          Prix max du bien
          <InfoTooltip
            principe="Minimum des contraintes crédit et apport"
            :calcul="`C1 (crédit) = ${formatCurrency(result.c1)}, C2 (apport) = ${formatCurrency(result.c2)}`"
          />
        </div>
        <div class="text-xl font-bold text-green-700 dark:text-green-400">{{ formatCurrency(result.maxPrice) }}</div>
      </div>
      <div class="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-center transition-colors">
        <div class="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 uppercase">
          Frais de notaire
          <InfoTooltip
            principe="Frais d'acquisition non finançables par le crédit"
            :calcul="`${formatCurrency(result.maxPrice)} × ${propertyType === 'ancien' ? '8' : '3'} %`"
          />
        </div>
        <div class="text-xl font-bold text-orange-600 dark:text-orange-400">{{ formatCurrency(result.notaryFees) }}</div>
      </div>
      <!-- Frais d'agence (affiché uniquement si renseigné) -->
      <div v-if="result.agencyFees > 0" class="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center transition-colors">
        <div class="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 uppercase">
          Frais d'agence
          <InfoTooltip
            v-if="agencyFeesMode === '%'"
            principe="Commission d'agence sur le prix max du bien"
            :calcul="`${formatCurrency(result.maxPrice)} × ${agencyFees} %`"
          />
        </div>
        <div class="text-xl font-bold text-purple-700 dark:text-purple-400">{{ formatCurrency(result.agencyFees) }}</div>
      </div>
      <div class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center transition-colors">
        <div class="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 uppercase">
          Budget total
          <InfoTooltip
            principe="Enveloppe totale disponible pour l'achat"
            :calcul="`${formatCurrency(borrowingCapacity)} + ${formatCurrency(personalContribution || 0)}`"
          />
        </div>
        <div class="text-xl font-bold text-blue-700 dark:text-blue-400">{{ formatCurrency(result.totalBudget) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { calculateMaxPropertyPrice, formatCurrency } from '../services/loanCalculator.js'
import NumberInput from './NumberInput.vue'
import InfoTooltip from './InfoTooltip.vue'

const props = defineProps({
  borrowingCapacity: {
    type: Number,
    default: 0
  }
})

const personalContribution = ref(0)
const agencyFees = ref(null)
const agencyFeesMode = ref('€')
const propertyType = ref('ancien')

const result = computed(() =>
  calculateMaxPropertyPrice(
    props.borrowingCapacity,
    personalContribution.value || 0,
    propertyType.value,
    agencyFees.value || 0,
    agencyFeesMode.value
  )
)
</script>
