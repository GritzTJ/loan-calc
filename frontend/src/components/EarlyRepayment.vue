<template>
  <CollapsibleSection title="Remboursement anticipé" :summary="amount > 0 ? formatEuros(amount) : ''" :open="amount > 0">
    <FormField v-slot="{ id }" label="Montant remboursé">
      <NumberInput :id="id" v-model="amount" suffix="€" placeholder="0" />
    </FormField>

    <DurationField v-model="afterMonths" label="Au bout de" />

    <FormField v-slot="{ labelId }" class="sm:col-span-2 lg:col-span-1" label="Effet" group>
      <SegmentedControl v-model="effect" :aria-labelledby="labelId" :options="EFFECTS" />
    </FormField>

    <label class="sm:col-span-2 lg:col-span-1 flex items-start gap-3 text-sm text-ink cursor-pointer">
      <input v-model="withPenalty" type="checkbox" class="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--primary))]" />
      <span>
        Compter les indemnités au plafond légal
        <span class="block text-xs text-ink-3 mt-0.5">
          Six mois d'intérêts sur le montant remboursé, 3 % du restant dû au plus. Votre contrat peut prévoir moins.
        </span>
      </span>
    </label>
  </CollapsibleSection>

  <CollapsibleSection title="Changement de mensualité" :summary="modulationPayment > 0 ? formatCurrency(modulationPayment) : ''" :open="modulationPayment > 0">
    <FormField label="Nouvelle mensualité de crédit">
      <template #default="{ id }">
        <NumberInput :id="id" v-model="modulationPayment" :decimals="2" suffix="€" :placeholder="placeholderPayment" />
      </template>
      <template #help>Hors assurance. La durée du prêt s'ajuste.</template>
    </FormField>

    <DurationField v-model="modulationAfterMonths" label="Au bout de" />
  </CollapsibleSection>
</template>

<script setup>
import { formatCurrency, formatEuros } from '../services/loanCalculator.js'
import CollapsibleSection from './CollapsibleSection.vue'
import DurationField from './DurationField.vue'
import FormField from './FormField.vue'
import NumberInput from './NumberInput.vue'
import SegmentedControl from './SegmentedControl.vue'

// Les deux événements qui modifient le déroulé d'un prêt en cours : un versement anticipé,
// et un changement de mensualité (modulation). Les durées « au bout de » sont en mois écoulés.
const amount = defineModel('amount', { type: Number, default: null })
const afterMonths = defineModel('afterMonths', { type: Number, default: null })
const effect = defineModel('effect', { type: String, default: 'duration' })
const withPenalty = defineModel('withPenalty', { type: Boolean, default: true })
const modulationPayment = defineModel('modulationPayment', { type: Number, default: null })
const modulationAfterMonths = defineModel('modulationAfterMonths', { type: Number, default: null })

defineProps({
  // Mensualité actuelle, donnée en exemple dans le champ
  placeholderPayment: { type: String, default: '' }
})

const EFFECTS = [
  { value: 'duration', label: 'Réduire la durée' },
  { value: 'payment', label: 'Réduire la mensualité' }
]
</script>
