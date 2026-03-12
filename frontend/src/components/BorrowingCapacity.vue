<template>
  <div>
    <h2 class="text-xl font-bold text-gray-800 mb-4">Capacité d'emprunt</h2>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Revenus nets mensuels -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Revenus nets mensuels (€)</label>
        <input
          v-model.number="monthlyIncome"
          type="number"
          min="0"
          step="100"
          class="input-field"
          placeholder="4 000"
        />
      </div>

      <!-- Charges mensuelles -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Charges mensuelles (€)</label>
        <input
          v-model.number="monthlyCharges"
          type="number"
          min="0"
          step="50"
          class="input-field"
          placeholder="500"
        />
      </div>

      <!-- Taux d'endettement -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Taux d'endettement cible (%)</label>
        <input
          v-model.number="debtRatio"
          type="number"
          min="1"
          max="100"
          step="1"
          class="input-field"
          placeholder="35"
        />
      </div>

      <!-- Durée souhaitée -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Durée souhaitée (mois)</label>
        <input
          v-model.number="months"
          type="number"
          min="1"
          max="600"
          step="1"
          class="input-field"
          placeholder="240"
        />
        <p v-if="months" class="text-xs text-gray-400 mt-1">
          = {{ Math.floor(months / 12) }} an{{ Math.floor(months / 12) > 1 ? 's' : '' }}
          <span v-if="months % 12"> et {{ months % 12 }} mois</span>
        </p>
      </div>

      <!-- Taux annuel -->
      <div class="sm:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1">Taux annuel (%)</label>
        <input
          v-model.number="annualRate"
          type="number"
          min="0"
          max="20"
          step="0.01"
          class="input-field sm:w-1/2"
          placeholder="3.50"
        />
      </div>
    </div>

    <!-- Résultats -->
    <div v-if="isValid" class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
        <div class="text-sm text-gray-500 uppercase tracking-wide">Mensualité maximale</div>
        <div class="text-2xl font-bold text-blue-700 mt-1">
          {{ formatCurrency(maxPayment) }}
        </div>
      </div>
      <div class="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
        <div class="text-sm text-gray-500 uppercase tracking-wide">Capital empruntable</div>
        <div class="text-2xl font-bold text-green-700 mt-1">
          {{ formatCurrency(capacity) }}
        </div>
      </div>
    </div>

    <!-- Alerte endettement négatif -->
    <div v-if="isValid && maxPayment <= 0" class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
      Vos charges dépassent la capacité d'endettement. Réduisez vos charges ou augmentez vos revenus.
    </div>

    <!-- Sous-section prix du bien -->
    <PropertyPrice v-if="isValid && capacity > 0" :borrowing-capacity="capacity" />

    <!-- TODO v2: bouton "Sauvegarder cette simulation" via storageService -->
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  calculateMaxMonthlyPayment,
  calculateBorrowingCapacity,
  formatCurrency
} from '../services/loanCalculator.js'
import PropertyPrice from './PropertyPrice.vue'

// --- State ---
const monthlyIncome = ref(4000)
const monthlyCharges = ref(500)
const debtRatio = ref(35)
const months = ref(240)
const annualRate = ref(3.5)

// --- Computed ---
const isValid = computed(() =>
  monthlyIncome.value > 0 && months.value > 0
  && typeof annualRate.value === 'number' && annualRate.value >= 0
  && typeof debtRatio.value === 'number' && debtRatio.value > 0
)

const maxPayment = computed(() =>
  calculateMaxMonthlyPayment(monthlyIncome.value, monthlyCharges.value || 0, debtRatio.value)
)

const capacity = computed(() =>
  calculateBorrowingCapacity(maxPayment.value, annualRate.value, months.value)
)
</script>
