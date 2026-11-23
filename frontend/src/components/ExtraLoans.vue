<template>
  <CollapsibleSection title="Prêts complémentaires" :summary="summary" :open="loans.length > 0">
    <fieldset
      v-for="(loan, index) in loans"
      :key="index"
      class="sm:col-span-2 lg:col-span-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 border border-line rounded-xl p-3"
    >
      <legend class="sr-only">Prêt complémentaire {{ index + 1 }}</legend>
      <div class="sm:col-span-2 lg:col-span-1 flex items-center gap-2">
        <SegmentedControl
          class="flex-1"
          :model-value="loan.type"
          :aria-label="`Type du prêt complémentaire ${index + 1}`"
          :options="EXTRA_LOAN_TYPES"
          @update:model-value="setType(index, $event)"
        />
        <button type="button" class="btn btn-quiet px-2.5 shrink-0" :aria-label="`Retirer le prêt complémentaire ${index + 1}`" @click="remove(index)">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <FormField v-slot="{ id }" label="Montant">
        <NumberInput :id="id" :model-value="loan.principal" suffix="€" placeholder="40 000" @update:model-value="update(index, { principal: $event })" />
      </FormField>

      <FormField v-slot="{ id }" label="Taux annuel">
        <NumberInput :id="id" :model-value="loan.annualRate" :decimals="2" :max="MAX_RATE" suffix="%" placeholder="0" @update:model-value="update(index, { annualRate: $event })" />
      </FormField>

      <DurationField :model-value="loan.months" @update:model-value="update(index, { months: $event })" />

      <!-- Vide : le prêt est assuré au taux du prêt principal, rappelé en grisé. 0 : pas d'assurance. -->
      <FormField v-slot="{ id }" label="Assurance">
        <NumberInput
          :id="id"
          :model-value="loan.insuranceRate ?? null"
          :decimals="3"
          :max="MAX_RATE"
          suffix="% / an"
          :placeholder="mainRateText"
          @update:model-value="update(index, { insuranceRate: $event })"
        />
        <p class="text-xs text-ink-3 mt-1">Vide : comme le prêt principal. 0 : pas d'assurance.</p>
      </FormField>
    </fieldset>

    <div class="sm:col-span-2 lg:col-span-1">
      <button v-if="loans.length < MAX_EXTRA_LOANS" type="button" class="btn btn-secondary" @click="add">
        Ajouter un prêt
      </button>
    </div>

    <label v-if="loans.length" class="sm:col-span-2 lg:col-span-1 flex items-start gap-3 text-sm text-ink cursor-pointer">
      <input v-model="smoothing" type="checkbox" class="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--primary))]" />
      <span>
        Lisser les mensualités
        <span class="block text-xs text-ink-3 mt-0.5">
          Le total reste le même chaque mois : le prêt principal rembourse moins tant que les autres courent, plus ensuite.
        </span>
      </span>
    </label>
  </CollapsibleSection>
</template>

<script setup>
import { computed } from 'vue'
import { formatEuros, MAX_RATE } from '../services/loanCalculator.js'
import { EXTRA_LOAN_TYPES, MAX_EXTRA_LOANS } from '../services/multiLoan.js'
import CollapsibleSection from './CollapsibleSection.vue'
import DurationField from './DurationField.vue'
import FormField from './FormField.vue'
import NumberInput from './NumberInput.vue'
import SegmentedControl from './SegmentedControl.vue'

// Prêts qui complètent le prêt principal (PTZ, prêt employeur…) : [{ type, principal, annualRate, months, insuranceRate }]
const loans = defineModel('loans', { type: Array, default: () => [] })
const smoothing = defineModel('smoothing', { type: Boolean, default: false })

const props = defineProps({
  // Taux d'assurance du prêt principal : celui d'un prêt complémentaire dont le champ est laissé vide
  mainInsuranceRate: { type: Number, default: null }
})
const mainRateText = computed(() => String(props.mainInsuranceRate || 0).replace('.', ','))

const summary = computed(() => {
  const total = loans.value.reduce((sum, loan) => sum + (loan.principal || 0), 0)
  if (!loans.value.length) return ''
  return `${loans.value.length} prêt${loans.value.length > 1 ? 's' : ''}, ${formatEuros(total)}`
})

// La liste est remplacée à chaque modification : le parent la conserve (localStorage) et la recalcule
function update(index, changes) {
  loans.value = loans.value.map((loan, i) => (i === index ? { ...loan, ...changes } : loan))
}

// Changer de type propose le taux habituel de ce type (0 % pour un PTZ), sans écraser un taux déjà saisi pour « Autre »
function setType(index, type) {
  const usualRate = EXTRA_LOAN_TYPES.find(t => t.value === type).annualRate
  update(index, { type, ...(usualRate !== null ? { annualRate: usualRate } : {}) })
}

function add() {
  loans.value = [...loans.value, { type: 'ptz', principal: null, annualRate: 0, months: 180, insuranceRate: null }]
}

function remove(index) {
  loans.value = loans.value.filter((_, i) => i !== index)
}
</script>
