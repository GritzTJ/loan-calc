<template>
  <div class="mt-6 border-t border-gray-200 pt-5">
    <h3 class="text-lg font-semibold text-gray-800 mb-3">Prix du bien accessible</h3>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Apport personnel -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Apport personnel (€)</label>
        <input
          v-model.number="personalContribution"
          type="number"
          min="0"
          step="1000"
          class="input-field"
          placeholder="0"
        />
      </div>

      <!-- Type de bien -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Type de bien</label>
        <div class="flex gap-3 mt-2">
          <button
            @click="propertyType = 'ancien'"
            class="flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors"
            :class="propertyType === 'ancien'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
          >
            Ancien (8%)
          </button>
          <button
            @click="propertyType = 'neuf'"
            class="flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors"
            :class="propertyType === 'neuf'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
          >
            Neuf (3%)
          </button>
        </div>
      </div>
    </div>

    <!-- Résultats -->
    <div v-if="borrowingCapacity > 0" class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <div class="text-xs text-gray-500 uppercase">Prix max du bien</div>
        <div class="text-xl font-bold text-green-700">{{ formatCurrency(result.maxPrice) }}</div>
      </div>
      <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
        <div class="text-xs text-gray-500 uppercase">Frais de notaire</div>
        <div class="text-xl font-bold text-orange-600">{{ formatCurrency(result.notaryFees) }}</div>
      </div>
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <div class="text-xs text-gray-500 uppercase">Budget total</div>
        <div class="text-xl font-bold text-blue-700">{{ formatCurrency(result.totalBudget) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { calculateMaxPropertyPrice, formatCurrency } from '../services/loanCalculator.js'

const props = defineProps({
  borrowingCapacity: {
    type: Number,
    default: 0
  }
})

const personalContribution = ref(0)
const propertyType = ref('ancien')

const result = computed(() =>
  calculateMaxPropertyPrice(
    props.borrowingCapacity,
    personalContribution.value || 0,
    propertyType.value
  )
)
</script>
