<template>
  <div>
    <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-5">Projet d'achat</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
      Vous connaissez le prix du bien — calculez le montant à emprunter.
    </p>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Prix du bien -->
      <div class="sm:col-span-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Prix du bien (€)
        </label>
        <NumberInput v-model="propertyPrice" placeholder="300 000" />
      </div>

      <!-- Apport personnel -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Apport personnel (€)
          <span class="font-normal text-gray-400 dark:text-gray-500">(optionnel)</span>
        </label>
        <NumberInput v-model="personalContribution" placeholder="0" />
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
        <NumberInput v-model="agencyFees" placeholder="0" />
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

    <!-- Résultats -->
    <div v-if="isValid" class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3" :class="result.agencyFees > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'">
      <!-- Montant à emprunter (mis en avant) -->
      <div class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center transition-colors">
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Montant à emprunter</div>
        <div class="text-xl font-bold text-green-700 dark:text-green-400 mt-1">{{ formatCurrency(result.loanAmount) }}</div>
      </div>

      <!-- Frais de notaire -->
      <div class="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-center transition-colors">
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Frais de notaire</div>
        <div class="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">{{ formatCurrency(result.notaryFees) }}</div>
      </div>

      <!-- Frais d'agence (uniquement si > 0) -->
      <div v-if="result.agencyFees > 0" class="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center transition-colors">
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Frais d'agence</div>
        <div class="text-xl font-bold text-purple-700 dark:text-purple-400 mt-1">{{ formatCurrency(result.agencyFees) }}</div>
      </div>

      <!-- Coût total -->
      <div class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center transition-colors">
        <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Coût total acquisition</div>
        <div class="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1">{{ formatCurrency(result.totalCost) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { calculateLoanAmount, formatCurrency } from '../services/loanCalculator.js'
import NumberInput from './NumberInput.vue'

const propertyPrice = ref(null)
const personalContribution = ref(null)
const agencyFees = ref(null)
const agencyFeesMode = ref('€')
const propertyType = ref('ancien')

const isValid = computed(() => (propertyPrice.value || 0) > 0)

const result = computed(() =>
  calculateLoanAmount(
    propertyPrice.value || 0,
    propertyType.value,
    agencyFees.value || 0,
    agencyFeesMode.value,
    personalContribution.value || 0
  )
)
</script>
