<template>
  <CalculatorLayout
    title="Simulateur de prêt"
    :ready="isValid"
    empty-hint="Saisissez un montant, un taux et une durée pour obtenir la mensualité."
    resettable
    @reset="onReset"
  >
    <template #summary>
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-sm text-ink-2">{{ isDecreasing ? 'Première mensualité, assurance comprise' : monthlyLabel }}</span>
        <span class="figure text-lg text-ink">{{ formatCurrency(monthlyTotal) }}</span>
      </div>
    </template>

    <template #form>
      <FormField v-slot="{ id }" label="Montant emprunté">
        <NumberInput :id="id" v-model="principal" suffix="€" placeholder="200 000" />
      </FormField>

      <FormField v-slot="{ id }" label="Taux annuel">
        <NumberInput :id="id" v-model="annualRate" :decimals="2" :max="MAX_RATE" suffix="%" placeholder="3,50" />
      </FormField>

      <DurationField v-model="months" />

      <FormField label="Date de début">
        <template #default="{ id }">
          <input :id="id" v-model="startDateStr" type="date" class="input-field" />
        </template>
        <template #help>Première mensualité le {{ firstPaymentLabel }}</template>
      </FormField>

      <InsuranceField v-model:rate="insuranceRate" v-model:mode="insuranceMode" v-model:quota="insuranceQuota" />

      <CollapsibleSection title="Frais et seuil d'usure" :summary="feesSummary" :open="upfrontFees > 0 || usuryOverride !== null">
        <FormField v-slot="{ id }" label="Frais de dossier" hint="(optionnel)">
          <NumberInput :id="id" v-model="applicationFees" suffix="€" placeholder="0" />
        </FormField>

        <FormField label="Frais de garantie" hint="(optionnel)">
          <template #default="{ id }">
            <NumberInput :id="id" v-model="guaranteeFees" suffix="€" placeholder="0" />
          </template>
          <template #help>Caution ou hypothèque : le montant figure dans l'offre de prêt, souvent 1 à 1,5 % du capital.</template>
        </FormField>

        <FormField label="Seuil d'usure" hint="(optionnel)">
          <template #default="{ id }">
            <NumberInput :id="id" v-model="usuryOverride" :decimals="2" :max="MAX_RATE" suffix="%" :placeholder="formatRate(embeddedUsury)" />
          </template>
          <template #help>
            Laissez vide pour le seuil du {{ USURY.label }} ({{ formatPercent(embeddedUsury) }} pour cette durée).
          </template>
        </FormField>
      </CollapsibleSection>
    </template>

    <template #result>
      <p class="flex items-center text-sm text-ink-2">
        {{ isDecreasing ? 'Première mensualité, assurance comprise' : monthlyLabel }}
        <InfoTooltip
          principe="Amortissement à taux fixe sur la durée"
          :calcul="`${formatEuros(principal)} à ${formatPercent(annualRate)} sur ${months} mois`"
        />
      </p>
      <p class="figure text-hero text-ink mt-1.5">{{ formatCurrency(monthlyTotal) }}</p>
      <p v-if="monthlyInsurance > 0" class="mt-2 text-sm text-ink-2">
        dont <span class="figure text-ink">{{ formatCurrency(monthlyPayment) }}</span> de crédit
        et <span class="figure text-ink">{{ formatCurrency(monthlyInsurance) }}</span> d'assurance
      </p>
      <!-- Assurance sur le capital restant dû : la mensualité affichée est la première, la plus élevée -->
      <p v-if="isDecreasing" class="mt-1 text-sm text-ink-2">
        Elle baisse ensuite jusqu'à <span class="figure text-ink">{{ formatCurrency(lastMonthlyTotal) }}</span> :
        l'assurance suit le capital restant dû.
      </p>
      <p class="mt-1 text-sm text-ink-3">
        Pendant {{ formatDuration(months) }}, à partir du {{ firstPaymentLabel }}
      </p>
      <div class="mt-4">
        <SaveSimulation placeholder="Ex : Appart Lyon - 20 ans" :save="save" :update="update" :current="current" />
      </div>

      <FundingBar class="mt-6" title="Total des mensualités" :total="totalPayments" :segments="costSegments">
        <template #after>
          <li v-if="applicationFees > 0" class="flex items-baseline justify-between gap-3 text-sm">
            <span class="text-ink-2 pl-[1.125rem]">Frais de dossier</span>
            <span class="figure text-ink">{{ formatEuros(applicationFees) }}</span>
          </li>
          <li v-if="guaranteeFees > 0" class="flex items-baseline justify-between gap-3 text-sm">
            <span class="text-ink-2 pl-[1.125rem]">Frais de garantie</span>
            <span class="figure text-ink">{{ formatEuros(guaranteeFees) }}</span>
          </li>
          <li class="flex items-baseline justify-between gap-3 text-sm pt-2 mt-2 border-t border-line">
            <span class="flex items-center font-medium text-ink">
              Coût du crédit
              <InfoTooltip
                principe="Tout ce que le prêt coûte en plus du capital"
                :calcul="creditCostFormula"
              />
            </span>
            <span class="figure text-base text-ink">{{ formatEuros(creditCost) }}</span>
          </li>
          <!-- TAEG : le taux tout compris, celui que les banques affichent et que la loi plafonne -->
          <li v-if="taeg !== null" class="flex items-baseline justify-between gap-3 text-sm pt-2">
            <span class="flex items-center font-medium text-ink">
              TAEG
              <InfoTooltip
                principe="Taux annuel tout compris : intérêts, assurance, frais de dossier et de garantie"
                :calcul="`Taux nominal ${formatPercent(annualRate)}, frais au départ ${formatEuros(upfrontFees)}`"
              />
            </span>
            <span class="figure text-base text-ink">{{ formatPercent(taeg) }}</span>
          </li>
        </template>
      </FundingBar>

      <!-- Seuil d'usure : au-dessus, la banque ne peut pas accorder le prêt. L'état est écrit, pas seulement coloré. -->
      <template v-if="taeg !== null">
        <p v-if="taeg > usuryRate" role="alert" class="notice notice-danger mt-4">
          Le TAEG dépasse le seuil d'usure de <strong class="figure">{{ formatPercent(usuryRate) }}</strong> :
          une banque ne peut pas accorder ce prêt en l'état.
          <span v-if="usuryNote">{{ usuryNote }}</span>
        </p>
        <p v-else class="mt-3 text-sm text-ink-2">
          Sous le seuil d'usure de <span class="figure text-ink">{{ formatPercent(usuryRate) }}</span>.
          <span v-if="usuryNote" class="text-ink-3">{{ usuryNote }}</span>
        </p>
      </template>
    </template>

    <template #below>
      <AmortizationTable v-if="isValid" :rows="amortizationTable" />
    </template>
  </CalculatorLayout>
</template>

<script setup>
import { computed, toRefs, watch } from 'vue'
import {
  calculateMonthlyPayment,
  calculateTAEG,
  generateAmortizationTable,
  getDefaultStartDate,
  formatCurrency,
  formatEuros,
  formatDate,
  formatDuration,
  formatPercent,
  sanitizeMonths,
  MAX_RATE
} from '../services/loanCalculator.js'
import { USURY, usuryRateFor, isUsuryOutdated } from '../services/usury.js'
import { usePersistedState } from '../composables/usePersistedState.js'
import { useSavedSimulation } from '../composables/useSavedSimulation.js'
import AmortizationTable from './AmortizationTable.vue'
import CalculatorLayout from './CalculatorLayout.vue'
import CollapsibleSection from './CollapsibleSection.vue'
import DurationField from './DurationField.vue'
import FormField from './FormField.vue'
import FundingBar from './FundingBar.vue'
import InsuranceField from './InsuranceField.vue'
import NumberInput from './NumberInput.vue'
import InfoTooltip from './InfoTooltip.vue'
import SaveSimulation from './SaveSimulation.vue'

// Préremplissage depuis l'historique, ou depuis « Simuler ce prêt » (Capacité, Projet)
const props = defineProps({
  loadParams: { type: Object, default: null }
})

// --- State ---
// Exemple de départ, puis saisie conservée d'une visite à l'autre (localStorage)
const { state, reset } = usePersistedState('simulator', {
  principal: 200000,
  annualRate: 3.5,
  months: 240,
  // null = date automatique (1er du mois prochain) : une date mémorisée finirait dans le passé
  startDate: null,
  insuranceRate: null,
  insuranceMode: 'initial',
  insuranceQuota: 100,
  applicationFees: null,
  guaranteeFees: null,
  // null = seuil d'usure embarqué (services/usury.js) pour la durée du prêt
  usuryOverride: null
})
const {
  principal, annualRate, months, insuranceRate, insuranceMode, insuranceQuota,
  applicationFees, guaranteeFees, usuryOverride
} = toRefs(state)

const toDateInput = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

// Champ date : affiche la date automatique tant qu'aucune n'a été choisie
const startDateStr = computed({
  get: () => state.startDate ?? toDateInput(getDefaultStartDate()),
  set: (value) => { state.startDate = value || null }
})

const { current, save, update } = useSavedSimulation('loan', () => ({
  principal: principal.value,
  annualRate: annualRate.value,
  months: months.value,
  startDate: startDateStr.value,
  insuranceRate: insuranceRate.value,
  insuranceMode: insuranceMode.value,
  insuranceQuota: insuranceQuota.value,
  applicationFees: applicationFees.value,
  guaranteeFees: guaranteeFees.value
}))

watch(() => props.loadParams, (p) => {
  if (!p) return
  principal.value = p.principal ?? principal.value
  annualRate.value = p.annualRate ?? annualRate.value
  // Durée re-bornée : une valeur aberrante en base générerait un tableau d'amortissement démesuré
  months.value = sanitizeMonths(p.months) ?? months.value
  // Une simulation de l'historique remplace tout (un champ absent est vidé).
  // « Simuler ce prêt » (merge) ne transmet que ce qu'il connaît : un champ transmis est repris tel quel,
  // même vide (Capacité sans assurance → pas d'assurance ici), un champ non transmis garde la saisie en cours.
  const loaded = (key, currentValue, empty = null) => (key in p ? (p[key] ?? empty) : (p.merge ? currentValue : empty))
  insuranceRate.value = loaded('insuranceRate', insuranceRate.value)
  // Absent des simulations antérieures à la v2.6.3, qui calculaient sur le capital initial
  insuranceMode.value = loaded('insuranceMode', insuranceMode.value, 'initial')
  insuranceQuota.value = loaded('insuranceQuota', insuranceQuota.value, 100)
  applicationFees.value = loaded('applicationFees', applicationFees.value)
  guaranteeFees.value = loaded('guaranteeFees', guaranteeFees.value)
  if (p.startDate) state.startDate = p.startDate
  // « Simuler ce prêt » crée une nouvelle saisie : elle n'est plus liée à une simulation enregistrée
  current.value = p.source ?? null
}, { immediate: true })

function onReset() {
  reset()
  current.value = null
}

// --- Computed ---
// Champ date vidé ou illisible : on retombe sur la date par défaut plutôt que d'afficher « Invalid Date » partout
const startDate = computed(() => {
  const date = new Date(startDateStr.value + 'T00:00:00')
  return isNaN(date) ? getDefaultStartDate() : date
})

const firstPaymentLabel = computed(() => {
  const d = new Date(startDate.value.getFullYear(), startDate.value.getMonth() + 1, 1)
  return formatDate(d)
})

const isValid = computed(() =>
  principal.value > 0 && typeof annualRate.value === 'number' && annualRate.value >= 0 && months.value > 0
)

const monthlyPayment = computed(() =>
  calculateMonthlyPayment(principal.value, annualRate.value, months.value)
)

// Le tableau est la source de tous les totaux : il porte l'assurance de chaque échéance,
// qu'elle soit fixe (capital initial) ou dégressive (capital restant dû).
const amortizationTable = computed(() =>
  generateAmortizationTable(principal.value, annualRate.value, months.value, startDate.value, {
    insuranceRate: insuranceRate.value,
    insuranceMode: insuranceMode.value,
    insuranceQuota: insuranceQuota.value
  })
)

const sumOf = (key) => Math.round(amortizationTable.value.reduce((sum, row) => sum + row[key], 0) * 100) / 100

// Première échéance : assurance et total du mois (les plus élevés en mode « restant dû »)
const monthlyInsurance = computed(() => amortizationTable.value[0]?.insurancePart ?? 0)
const monthlyTotal = computed(() => amortizationTable.value[0]?.totalPayment ?? 0)

// Dernière échéance pleine (la toute dernière absorbe les arrondis) : sert à dire jusqu'où la mensualité baisse
const lastMonthlyTotal = computed(() => {
  const rows = amortizationTable.value
  return rows.length > 1 ? Math.round((monthlyPayment.value + rows.at(-1).insurancePart) * 100) / 100 : monthlyTotal.value
})

const isDecreasing = computed(() => insuranceMode.value === 'crd' && monthlyInsurance.value > 0)

const monthlyLabel = computed(() =>
  monthlyInsurance.value > 0 ? 'Mensualité, assurance comprise' : 'Mensualité'
)

const totalInterest = computed(() => sumOf('interestPart'))
const totalInsurance = computed(() => sumOf('insurancePart'))

const totalPayments = computed(() =>
  Math.round((principal.value + totalInterest.value + totalInsurance.value) * 100) / 100
)

// Frais payés au départ, hors mensualités
const upfrontFees = computed(() => (applicationFees.value || 0) + (guaranteeFees.value || 0))

const creditCost = computed(() =>
  Math.round((totalInterest.value + totalInsurance.value + upfrontFees.value) * 100) / 100
)

const taeg = computed(() =>
  calculateTAEG(principal.value, upfrontFees.value, amortizationTable.value.map(row => row.totalPayment))
)

// Seuil d'usure : celui saisi, sinon celui du trimestre embarqué pour la durée du prêt
const embeddedUsury = computed(() => usuryRateFor(months.value || 0))
const usuryRate = computed(() => usuryOverride.value ?? embeddedUsury.value)
const usuryNote = computed(() => {
  if (usuryOverride.value !== null) return 'Seuil saisi par vos soins.'
  return isUsuryOutdated()
    ? `Seuil du ${USURY.label}, périmé : vérifiez la valeur en vigueur.`
    : `Seuil du ${USURY.label}.`
})

// Taux sans unité, pour l'exemple grisé d'un champ qui affiche déjà « % »
const formatRate = (value) => String(value).replace('.', ',')

const feesSummary = computed(() => (upfrontFees.value > 0 ? formatEuros(upfrontFees.value) : ''))

const costSegments = computed(() => [
  { key: 'capital', label: 'Capital emprunté', value: principal.value || 0, color: 'capital' },
  { key: 'interest', label: 'Intérêts', value: totalInterest.value, color: 'interest', always: true },
  { key: 'insurance', label: 'Assurance', value: totalInsurance.value, color: 'insurance' }
])

const creditCostFormula = computed(() => {
  const parts = [`${formatEuros(totalInterest.value)} d'intérêts`]
  if (totalInsurance.value > 0) parts.push(`${formatEuros(totalInsurance.value)} d'assurance`)
  if (applicationFees.value > 0) parts.push(`${formatEuros(applicationFees.value)} de frais de dossier`)
  if (guaranteeFees.value > 0) parts.push(`${formatEuros(guaranteeFees.value)} de garantie`)
  return parts.join(' + ')
})
</script>
