<template>
  <div>
    <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-5">Projet d'achat</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
      Vous connaissez le prix du bien — calculez le montant à emprunter.
    </p>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField v-slot="{ id }" class="sm:col-span-2" label="Prix net vendeur (€)" hint="(hors frais d'agence)">
        <NumberInput :id="id" v-model="propertyPrice" placeholder="300 000" />
      </FormField>

      <FormField v-slot="{ id }" label="Apport personnel (€)" hint="(optionnel)">
        <NumberInput :id="id" v-model="personalContribution" placeholder="0" />
      </FormField>

      <FormField label="Frais d'agence" hint="(optionnel)">
        <template #aside>
          <SegmentedControl v-model="agencyFeesMode" size="sm" aria-label="Unité des frais d'agence" :options="AGENCY_FEES_MODES" />
        </template>
        <template #default="{ id }">
          <NumberInput :id="id" v-model="agencyFees" :decimals="2" placeholder="0" />
        </template>
      </FormField>

      <FormField v-slot="{ id }" label="Frais de dossier (€)" hint="(optionnel)">
        <NumberInput :id="id" v-model="applicationFees" placeholder="0" />
      </FormField>

      <FormField v-slot="{ labelId }" class="sm:col-span-2" label="Type de bien" group>
        <SegmentedControl v-model="propertyType" class="mt-2" :aria-labelledby="labelId" :options="PROPERTY_TYPES" />
      </FormField>
    </div>

    <!-- Avertissement apport insuffisant pour couvrir les frais non finançables -->
    <div v-if="isValid && result.fundingGap > 0" class="mt-5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-300">
      Apport insuffisant : il manque <strong>{{ formatCurrency(result.fundingGap) }}</strong> pour couvrir les frais de notaire{{ result.applicationFees > 0 ? ' et de dossier' : '' }}. Ces frais ne peuvent pas être financés par le crédit (les frais d'agence, eux, peuvent l'être).
    </div>

    <!-- Résultats -->
    <div v-if="isValid" class="mt-5 grid grid-cols-1 gap-3" :class="result.agencyFees > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'">
      <!-- Montant à emprunter (mis en avant) -->
      <div class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center transition-colors">
        <div class="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Montant à emprunter
          <InfoTooltip
            principe="Coût total moins apport, plafonné au prix FAI"
            :calcul="`min(FAI = ${formatCurrency((propertyPrice || 0) + result.agencyFees)}, coût − apport = ${formatCurrency(result.totalCost - (personalContribution || 0))})`"
          />
        </div>
        <div class="text-xl font-bold text-green-700 dark:text-green-400 mt-1">{{ formatCurrency(result.loanAmount) }}</div>
      </div>

      <!-- Frais de notaire -->
      <div class="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-center transition-colors">
        <div class="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Frais de notaire
          <InfoTooltip
            principe="Frais d'acquisition non finançables par le crédit"
            :calcul="`${formatCurrency(propertyPrice || 0)} × ${formatPercent(NOTARY_FEES[propertyType] * 100)}`"
          />
        </div>
        <div class="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">{{ formatCurrency(result.notaryFees) }}</div>
      </div>

      <!-- Frais d'agence (uniquement si > 0) -->
      <div v-if="result.agencyFees > 0" class="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center transition-colors">
        <div class="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Frais d'agence
          <InfoTooltip
            v-if="agencyFeesMode === '%'"
            principe="Commission d'agence sur le prix net vendeur"
            :calcul="`${formatCurrency(propertyPrice || 0)} × ${formatPercent(agencyFees)}`"
          />
        </div>
        <div class="text-xl font-bold text-purple-700 dark:text-purple-400 mt-1">{{ formatCurrency(result.agencyFees) }}</div>
      </div>

      <!-- Coût total -->
      <div class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center transition-colors">
        <div class="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Coût total acquisition
          <InfoTooltip
            principe="Somme de tous les postes de dépense"
            :calcul="`${formatCurrency(propertyPrice || 0)} + ${formatCurrency(result.notaryFees)} + ${formatCurrency(result.agencyFees)}${result.applicationFees > 0 ? ' + ' + formatCurrency(result.applicationFees) : ''}`"
          />
        </div>
        <div class="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1">{{ formatCurrency(result.totalCost) }}</div>
        <div v-if="result.applicationFees > 0" class="text-xs text-gray-400 dark:text-gray-500 mt-1">
          dont {{ formatCurrency(result.applicationFees) }} de frais de dossier
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  calculateLoanAmount,
  formatCurrency,
  formatPercent,
  NOTARY_FEES,
  AGENCY_FEES_MODES,
  PROPERTY_TYPES
} from '../services/loanCalculator.js'
import FormField from './FormField.vue'
import NumberInput from './NumberInput.vue'
import InfoTooltip from './InfoTooltip.vue'
import SegmentedControl from './SegmentedControl.vue'

const propertyPrice = ref(null)
const personalContribution = ref(null)
const agencyFees = ref(null)
const agencyFeesMode = ref('€')
const propertyType = ref('ancien')
const applicationFees = ref(null)

const isValid = computed(() => (propertyPrice.value || 0) > 0)

const result = computed(() =>
  calculateLoanAmount(
    propertyPrice.value || 0,
    propertyType.value,
    agencyFees.value || 0,
    agencyFeesMode.value,
    personalContribution.value || 0,
    applicationFees.value || 0
  )
)
</script>
