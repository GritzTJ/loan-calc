<template>
  <CalculatorLayout
    title="Projet d'achat"
    intro="Vous connaissez le prix du bien : voici ce qu'il faut emprunter et ce que l'apport doit couvrir."
    :ready="isValid"
    empty-hint="Saisissez le prix du bien pour obtenir le montant à emprunter."
    resettable
    @reset="onReset"
  >
    <template #summary>
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-sm text-ink-2">Montant à emprunter</span>
        <span class="figure text-lg text-ink">{{ formatEuros(result.loanAmount) }}</span>
      </div>
      <div v-if="result.fundingGap > 0" class="flex items-baseline justify-between gap-3">
        <span class="text-sm text-danger font-medium">Apport manquant</span>
        <span class="figure text-base text-danger">{{ formatEuros(result.fundingGap) }}</span>
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
        <template #help>{{ AGENCY_FEES_HELP }}</template>
      </FormField>

      <FormField v-slot="{ id }" label="Frais de dossier" hint="(optionnel)">
        <NumberInput :id="id" v-model="applicationFees" suffix="€" placeholder="0" />
      </FormField>

      <FormField label="Frais de garantie" hint="(optionnel)">
        <template #default="{ id }">
          <NumberInput :id="id" v-model="guaranteeFees" suffix="€" placeholder="0" />
        </template>
        <template #help>Caution ou hypothèque, souvent 1 à 1,5 % du prêt.</template>
      </FormField>

      <FormField label="Travaux" hint="(optionnel)">
        <template #default="{ id }">
          <NumberInput :id="id" v-model="works" suffix="€" placeholder="0" />
        </template>
        <template #help>Finançables par le prêt.</template>
      </FormField>

      <NotaryRateField v-model:property-type="propertyType" v-model:dmto-rate="dmtoRate" />
    </template>

    <template #result>
      <p class="flex items-center text-sm text-ink-2">
        Montant à emprunter
        <InfoTooltip
          principe="Coût total moins apport, plafonné à ce que le prêt peut financer (prix, agence, travaux)"
          :calcul="`min(finançable = ${formatEuros(prixFAI)}, coût − apport = ${formatEuros(result.totalCost - (personalContribution || 0))})`"
        />
      </p>
      <p class="figure text-hero text-ink mt-1.5">{{ formatEuros(result.loanAmount) }}</p>

      <!-- Apport insuffisant pour couvrir les frais non finançables -->
      <p v-if="result.fundingGap > 0" class="notice notice-warn mt-4">
        Il manque <strong class="figure">{{ formatEuros(result.fundingGap) }}</strong> d'apport pour couvrir
        les frais de notaire{{ result.applicationFees + result.guaranteeFees > 0 ? ' et les frais bancaires' : '' }}.
        Ces frais ne peuvent pas être financés par le crédit (les frais d'agence, eux, peuvent l'être).
      </p>

      <!-- Apport supérieur au coût total : rien à emprunter, et il en reste -->
      <p v-if="result.surplus > 0" class="notice notice-info mt-4">
        Votre apport couvre tout le projet : aucun emprunt n'est nécessaire, et il vous reste
        <strong class="figure">{{ formatEuros(result.surplus) }}</strong>.
      </p>

      <div class="flex flex-wrap gap-2 mt-4">
        <button v-if="result.loanAmount > 0" type="button" class="btn btn-primary" @click="onSimulate">
          Simuler ce prêt
        </button>
        <SaveSimulation placeholder="Ex : Maison Nantes" :save="save" :update="update" :current="current" />
        <PdfButton :build="buildPdf" />
      </div>

      <!-- Plan de financement : les deux barres partagent la même échelle. Le prêt part de la gauche,
           l'apport de la droite ; s'ils ne se rejoignent pas, le vide est l'apport manquant. -->
      <FundingBar class="mt-6" title="Besoins" :total="result.totalCost" :scale="scale" :segments="needSegments">
        <template #info-notary>
          <InfoTooltip
            principe="Frais d'acquisition non finançables par le crédit, calculés au barème sur le prix net vendeur"
            :calcul="notaryDetail"
          />
        </template>
        <template v-if="agencyFeesMode === '%'" #info-agency>
          <InfoTooltip
            principe="Commission d'agence sur le prix net vendeur"
            :calcul="`${formatEuros(propertyPrice || 0)} × ${formatPercent(agencyFees || 0)}`"
          />
        </template>
      </FundingBar>
      <FundingBar class="mt-5" title="Ressources" :total="resources" :scale="scale" :segments="resourceSegments" />
    </template>
  </CalculatorLayout>
</template>

<script setup>
import { computed, toRefs, watch } from 'vue'
import {
  calculateLoanAmount,
  formatDate,
  formatEuros,
  formatPercent,
  AGENCY_FEES_HELP,
  AGENCY_FEES_MODES
} from '../services/loanCalculator.js'
import { calculateNotaryFees, describeNotaryFees, DEFAULT_DMTO } from '../services/notaryFees.js'
import { usePersistedState } from '../composables/usePersistedState.js'
import { useSavedSimulation } from '../composables/useSavedSimulation.js'
import CalculatorLayout from './CalculatorLayout.vue'
import FormField from './FormField.vue'
import FundingBar from './FundingBar.vue'
import NotaryRateField from './NotaryRateField.vue'
import NumberInput from './NumberInput.vue'
import PdfButton from './PdfButton.vue'
import InfoTooltip from './InfoTooltip.vue'
import SaveSimulation from './SaveSimulation.vue'
import SegmentedControl from './SegmentedControl.vue'

// Chargement depuis l'historique
const props = defineProps({
  loadParams: { type: Object, default: null }
})

// simulate : envoie le montant à emprunter vers l'onglet Simulateur
const emit = defineEmits(['simulate'])

// Exemple de départ, puis saisie conservée d'une visite à l'autre
const DEFAULTS = {
  propertyPrice: 250000,
  personalContribution: 25000,
  agencyFees: null,
  agencyFeesMode: '€',
  works: null,
  propertyType: 'ancien',
  dmtoRate: DEFAULT_DMTO,
  applicationFees: null,
  guaranteeFees: null
}
const { state, reset } = usePersistedState('project', DEFAULTS)
const {
  propertyPrice, personalContribution, agencyFees, agencyFeesMode, works, propertyType, dmtoRate,
  applicationFees, guaranteeFees
} = toRefs(state)

const { current, save, update } = useSavedSimulation('project', () => ({ ...state }))

// Une simulation de l'historique remplace toute la saisie (un champ absent est vidé)
watch(() => props.loadParams, (p) => {
  if (!p) return
  propertyPrice.value = p.propertyPrice ?? null
  personalContribution.value = p.personalContribution ?? null
  agencyFees.value = p.agencyFees ?? null
  agencyFeesMode.value = p.agencyFeesMode === '%' ? '%' : '€'
  works.value = p.works ?? null
  propertyType.value = p.propertyType === 'neuf' ? 'neuf' : 'ancien'
  dmtoRate.value = p.dmtoRate ?? DEFAULT_DMTO
  applicationFees.value = p.applicationFees ?? null
  guaranteeFees.value = p.guaranteeFees ?? null
  current.value = p.source ?? null
}, { immediate: true })

function onReset() {
  reset()
  current.value = null
}

const isValid = computed(() => (propertyPrice.value || 0) > 0)

const result = computed(() =>
  calculateLoanAmount(
    propertyPrice.value || 0,
    propertyType.value,
    agencyFees.value || 0,
    agencyFeesMode.value,
    personalContribution.value || 0,
    applicationFees.value || 0,
    guaranteeFees.value || 0,
    { dmtoRate: dmtoRate.value, works: works.value || 0 }
  )
)

// Détail des frais de notaire, pour l'info-bulle et le libellé (taux effectif)
const notary = computed(() => calculateNotaryFees(propertyPrice.value || 0, propertyType.value, dmtoRate.value))
const notaryRateLabel = computed(() => `≈ ${formatPercent(Math.round(notary.value.effectiveRate * 10) / 10)}`)
const notaryDetail = computed(() => describeNotaryFees(notary.value))

const prixFAI = computed(() => (propertyPrice.value || 0) + result.value.agencyFees + result.value.works)

// Ressources mobilisées : seule la part de l'apport nécessaire au projet compte (l'excédent est signalé à part)
const resources = computed(() =>
  Math.round((result.value.loanAmount + result.value.contributionUsed) * 100) / 100
)

const scale = computed(() => Math.max(result.value.totalCost, resources.value))

const needSegments = computed(() => [
  { key: 'price', label: 'Prix net vendeur', value: propertyPrice.value || 0, color: 'capital', group: 'Finançable par le prêt' },
  { key: 'agency', label: 'Frais d\'agence', value: result.value.agencyFees, color: 'capital', group: 'Finançable par le prêt' },
  { key: 'works', label: 'Travaux', value: result.value.works, color: 'capital', group: 'Finançable par le prêt' },
  { key: 'notary', label: `Frais de notaire (${notaryRateLabel.value})`, value: result.value.notaryFees, color: 'apport', group: 'À payer avec l\'apport' },
  { key: 'fees', label: 'Frais de dossier', value: result.value.applicationFees, color: 'apport', group: 'À payer avec l\'apport' },
  { key: 'guarantee', label: 'Frais de garantie', value: result.value.guaranteeFees, color: 'apport', group: 'À payer avec l\'apport' }
])

// Ordre : prêt, manque, apport — le manque se place entre les deux, sous les frais qu'il ne couvre pas
const resourceSegments = computed(() => [
  { key: 'loan', label: 'Prêt', value: result.value.loanAmount, color: 'capital', always: true },
  { key: 'gap', label: 'Apport manquant', value: result.value.fundingGap, color: 'gap' },
  { key: 'apport', label: result.value.surplus > 0 ? 'Apport utilisé' : 'Apport', value: result.value.contributionUsed, color: 'apport', always: true }
])

// Synthèse PDF : le plan de financement, besoins puis ressources
function buildPdf() {
  const filled = (segments) => segments.filter(s => s.value > 0).map(s => [s.label, formatEuros(s.value)])
  const resourceRows = [['Prêt', formatEuros(result.value.loanAmount)], [result.value.surplus > 0 ? 'Apport utilisé' : 'Apport', formatEuros(result.value.contributionUsed)]]
  if (result.value.fundingGap > 0) resourceRows.push(['Apport manquant', formatEuros(result.value.fundingGap)])
  if (result.value.surplus > 0) resourceRows.push(['Apport restant disponible', formatEuros(result.value.surplus)])
  return {
    title: current.value?.name || 'Projet d\'achat immobilier',
    subtitle: `Établi le ${formatDate(new Date())}`,
    sections: [
      { heading: 'Besoins', rows: [...filled(needSegments.value), ['Total', formatEuros(result.value.totalCost)]] },
      { heading: 'Ressources', rows: resourceRows },
      { heading: 'Frais de notaire', rows: [
        ['Type de bien', propertyType.value === 'neuf' ? 'Neuf' : 'Ancien'],
        ['Droits de mutation', formatEuros(notary.value.duties)],
        ['Émoluments du notaire', formatEuros(notary.value.emoluments)],
        ['Sécurité immobilière, formalités et débours', formatEuros(notary.value.csi + notary.value.disbursements)]
      ] }
    ],
    note: 'Estimation indicative. Les frais de notaire sont calculés au barème ; seul le décompte du notaire fait foi.',
    filename: 'projet-achat.pdf'
  }
}

function onSimulate() {
  emit('simulate', {
    principal: result.value.loanAmount,
    applicationFees: applicationFees.value,
    guaranteeFees: guaranteeFees.value
  })
}
</script>
