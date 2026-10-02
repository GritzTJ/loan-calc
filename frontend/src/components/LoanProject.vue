<template>
  <CalculatorLayout
    title="Projet d'achat"
    intro="Vous connaissez le prix du bien : voici ce qu'il faut emprunter et ce que l'apport doit couvrir."
    :ready="isValid"
    empty-hint="Saisissez le prix du bien pour obtenir le montant à emprunter."
  >
    <template #summary>
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-sm text-ink-2">Montant à emprunter</span>
        <span class="figure text-lg text-ink">{{ formatCurrency(result.loanAmount) }}</span>
      </div>
      <div v-if="result.fundingGap > 0" class="flex items-baseline justify-between gap-3">
        <span class="text-sm text-danger font-medium">Apport manquant</span>
        <span class="figure text-base text-danger">{{ formatCurrency(result.fundingGap) }}</span>
      </div>
    </template>

    <template #form>
      <FormField v-slot="{ id }" class="sm:col-span-2 lg:col-span-1" label="Prix net vendeur" hint="(hors frais d'agence)">
        <NumberInput :id="id" v-model="propertyPrice" suffix="€" placeholder="300 000" />
      </FormField>

      <FormField v-slot="{ id }" label="Apport personnel" hint="(optionnel)">
        <NumberInput :id="id" v-model="personalContribution" suffix="€" placeholder="0" />
      </FormField>

      <FormField label="Frais d'agence" hint="(optionnel)">
        <template #aside>
          <SegmentedControl v-model="agencyFeesMode" size="sm" aria-label="Unité des frais d'agence" :options="AGENCY_FEES_MODES" />
        </template>
        <template #default="{ id }">
          <NumberInput :id="id" v-model="agencyFees" :decimals="2" :suffix="agencyFeesMode" placeholder="0" />
        </template>
      </FormField>

      <FormField v-slot="{ id }" label="Frais de dossier" hint="(optionnel)">
        <NumberInput :id="id" v-model="applicationFees" suffix="€" placeholder="0" />
      </FormField>

      <FormField v-slot="{ labelId }" class="sm:col-span-2 lg:col-span-1" label="Type de bien" group>
        <SegmentedControl v-model="propertyType" :aria-labelledby="labelId" :options="PROPERTY_TYPES" />
      </FormField>
    </template>

    <template #result>
      <p class="flex items-center text-sm text-ink-2">
        Montant à emprunter
        <InfoTooltip
          principe="Coût total moins apport, plafonné au prix FAI"
          :calcul="`min(FAI = ${formatCurrency(prixFAI)}, coût − apport = ${formatCurrency(result.totalCost - (personalContribution || 0))})`"
        />
      </p>
      <p class="figure text-hero text-ink mt-1.5">{{ formatCurrency(result.loanAmount) }}</p>

      <!-- Apport insuffisant pour couvrir les frais non finançables -->
      <p v-if="result.fundingGap > 0" class="notice notice-warn mt-4">
        Il manque <strong class="figure">{{ formatCurrency(result.fundingGap) }}</strong> d'apport pour couvrir
        les frais de notaire{{ result.applicationFees > 0 ? ' et de dossier' : '' }}.
        Ces frais ne peuvent pas être financés par le crédit (les frais d'agence, eux, peuvent l'être).
      </p>

      <button v-if="result.loanAmount > 0" type="button" class="btn btn-primary mt-4" @click="onSimulate">
        Simuler ce prêt
      </button>

      <!-- Plan de financement : les deux barres partagent la même échelle. Le prêt part de la gauche,
           l'apport de la droite ; s'ils ne se rejoignent pas, le vide est l'apport manquant. -->
      <FundingBar class="mt-6" title="Besoins" :total="result.totalCost" :scale="scale" :segments="needSegments">
        <template #info-notary>
          <InfoTooltip
            principe="Frais d'acquisition non finançables par le crédit"
            :calcul="`${formatCurrency(propertyPrice || 0)} × ${notaryRateLabel}`"
          />
        </template>
        <template v-if="agencyFeesMode === '%'" #info-agency>
          <InfoTooltip
            principe="Commission d'agence sur le prix net vendeur"
            :calcul="`${formatCurrency(propertyPrice || 0)} × ${formatPercent(agencyFees || 0)}`"
          />
        </template>
      </FundingBar>
      <FundingBar class="mt-5" title="Ressources" :total="resources" :scale="scale" :segments="resourceSegments" />
    </template>
  </CalculatorLayout>
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
import CalculatorLayout from './CalculatorLayout.vue'
import FormField from './FormField.vue'
import FundingBar from './FundingBar.vue'
import NumberInput from './NumberInput.vue'
import InfoTooltip from './InfoTooltip.vue'
import SegmentedControl from './SegmentedControl.vue'

// simulate : envoie le montant à emprunter vers l'onglet Simulateur
const emit = defineEmits(['simulate'])

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

const notaryRateLabel = computed(() => formatPercent(NOTARY_FEES[propertyType.value] * 100))

const prixFAI = computed(() => (propertyPrice.value || 0) + result.value.agencyFees)

const resources = computed(() =>
  Math.round((result.value.loanAmount + (personalContribution.value || 0)) * 100) / 100
)

const scale = computed(() => Math.max(result.value.totalCost, resources.value))

const needSegments = computed(() => [
  { key: 'price', label: 'Prix net vendeur', value: propertyPrice.value || 0, color: 'capital', group: 'Finançable par le prêt' },
  { key: 'agency', label: 'Frais d\'agence', value: result.value.agencyFees, color: 'capital', group: 'Finançable par le prêt' },
  { key: 'notary', label: `Frais de notaire (${notaryRateLabel.value})`, value: result.value.notaryFees, color: 'apport', group: 'À payer avec l\'apport' },
  { key: 'fees', label: 'Frais de dossier', value: result.value.applicationFees, color: 'apport', group: 'À payer avec l\'apport' }
])

// Ordre : prêt, manque, apport — le manque se place entre les deux, sous les frais qu'il ne couvre pas
const resourceSegments = computed(() => [
  { key: 'loan', label: 'Prêt', value: result.value.loanAmount, color: 'capital', always: true },
  { key: 'gap', label: 'Apport manquant', value: result.value.fundingGap, color: 'gap' },
  { key: 'apport', label: 'Apport', value: personalContribution.value || 0, color: 'apport', always: true }
])

function onSimulate() {
  emit('simulate', {
    principal: result.value.loanAmount,
    applicationFees: applicationFees.value
  })
}
</script>
