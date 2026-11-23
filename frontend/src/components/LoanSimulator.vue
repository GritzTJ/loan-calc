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
      <FormField v-slot="{ id }" :label="extraLoans.length ? 'Montant du prêt principal' : 'Montant emprunté'">
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

      <ExtraLoans v-model:loans="extraLoans" v-model:smoothing="smoothing" :main-insurance-rate="insuranceRate" />

      <EarlyRepayment
        v-model:amount="earlyAmount"
        v-model:after-months="earlyAfterMonths"
        v-model:effect="earlyEffect"
        v-model:with-penalty="earlyPenalty"
        v-model:modulation-payment="modulationPayment"
        v-model:modulation-after-months="modulationAfterMonths"
        :placeholder-payment="formatRate(monthlyPayment)"
      />
    </template>

    <template #result>
      <p class="flex items-center text-sm text-ink-2">
        {{ isDecreasing ? 'Première mensualité, assurance comprise' : monthlyLabel }}
        <InfoTooltip
          principe="Amortissement à taux fixe sur la durée"
          :calcul="`${formatEuros(principal)} à ${formatPercent(annualRate)} sur ${months} mois${plan.loans.length > 1 ? ', plus les prêts complémentaires' : ''}`"
        />
      </p>
      <p class="figure text-hero text-ink mt-1.5">{{ formatCurrency(monthlyTotal) }}</p>
      <p v-if="monthlyInsurance > 0" class="mt-2 text-sm text-ink-2">
        dont <span class="figure text-ink">{{ formatCurrency(firstCreditPayment) }}</span> de crédit
        et <span class="figure text-ink">{{ formatCurrency(monthlyInsurance) }}</span> d'assurance
      </p>
      <!-- Assurance sur le capital restant dû : la mensualité affichée est la première, la plus élevée -->
      <p v-if="isDecreasing" class="mt-1 text-sm text-ink-2">
        Elle baisse ensuite jusqu'à <span class="figure text-ink">{{ formatCurrency(lastMonthlyTotal) }}</span> :
        l'assurance suit le capital restant dû.
      </p>
      <p class="mt-1 text-sm text-ink-3">
        Pendant {{ formatDuration(steps.length > 1 ? steps[0].months : amortizationTable.length) }}, à partir du {{ firstPaymentLabel }}
      </p>
      <!-- Plusieurs prêts sans lissage : la mensualité baisse quand un prêt se termine -->
      <ul v-if="steps.length > 1" class="mt-1 text-sm text-ink-2">
        <li v-for="step in steps.slice(1)" :key="step.fromNumber">
          puis <span class="figure text-ink">{{ formatCurrency(step.amount) }}</span>
          pendant {{ formatDuration(step.months) }}, à partir du {{ formatDate(step.date) }}
        </li>
      </ul>
      <p v-if="plan.smoothed" class="mt-1 text-sm text-ink-2">Mensualités lissées sur l'ensemble des prêts.</p>
      <p v-if="smoothing && extraLoans.length && !plan.smoothed && plan.loans.length > 1" class="notice notice-warn mt-3">
        Lissage impossible : un prêt complémentaire dure plus longtemps que le prêt principal.
      </p>
      <p v-if="plan.smoothed && hasEvents" class="notice notice-info mt-3">
        Le remboursement anticipé et le changement de mensualité ne sont pas appliqués quand les mensualités sont lissées.
      </p>
      <div class="flex flex-wrap gap-2 mt-4">
        <SaveSimulation placeholder="Ex : Appart Lyon - 20 ans" :save="save" :update="update" :current="current" />
        <PdfButton :build="buildPdf" />
      </div>

      <!-- Effet d'un remboursement anticipé ou d'un changement de mensualité, par rapport au prêt sans changement -->
      <div v-if="eventsEffect" class="mt-5 pt-4 border-t border-line">
        <h4 class="text-sm font-medium text-ink">Avec ces changements</h4>
        <p v-if="eventsEffect.notAmortizing" role="alert" class="notice notice-danger mt-2">
          La nouvelle mensualité ne couvre pas les intérêts : le prêt ne se rembourse plus.
        </p>
        <ul v-else class="mt-2 space-y-1.5 text-sm">
          <li class="flex items-baseline justify-between gap-3">
            <span class="text-ink-2">Fin du prêt</span>
            <span class="text-right text-ink">
              <span class="figure">{{ eventsEffect.endLabel }}</span>
              <span v-if="eventsEffect.monthsDelta" class="block text-xs text-ink-2">
                {{ formatDuration(Math.abs(eventsEffect.monthsDelta)) }} {{ eventsEffect.monthsDelta < 0 ? 'plus tôt' : 'plus tard' }}
              </span>
            </span>
          </li>
          <li v-if="eventsEffect.newPayment !== null" class="flex items-baseline justify-between gap-3">
            <span class="text-ink-2">Mensualité de crédit ensuite</span>
            <span class="figure text-ink">{{ formatCurrency(eventsEffect.newPayment) }}</span>
          </li>
          <li class="flex items-baseline justify-between gap-3">
            <span class="text-ink-2">{{ eventsEffect.saving >= 0 ? 'Intérêts et assurance économisés' : 'Intérêts et assurance en plus' }}</span>
            <span class="figure text-ink">{{ formatEuros(Math.abs(eventsEffect.saving)) }}</span>
          </li>
          <li v-if="eventsEffect.penalty > 0" class="flex items-baseline justify-between gap-3">
            <span class="text-ink-2">Indemnités de remboursement anticipé</span>
            <span class="figure text-ink">{{ formatEuros(eventsEffect.penalty) }}</span>
          </li>
          <li v-if="eventsEffect.penalty > 0" class="flex items-baseline justify-between gap-3 font-medium">
            <span class="text-ink">{{ eventsEffect.net >= 0 ? 'Gain net' : 'Coût net' }}</span>
            <span class="figure text-ink">{{ formatEuros(Math.abs(eventsEffect.net)) }}</span>
          </li>
        </ul>
      </div>

      <!-- Un prêt par ligne : ce que chacun pèse dans l'ensemble -->
      <table v-if="plan.loans.length > 1" class="w-full mt-5 text-sm">
        <thead>
          <tr class="text-xs text-ink-2 border-b border-line">
            <th scope="col" class="py-1.5 text-left font-medium">Prêt</th>
            <th scope="col" class="py-1.5 text-right font-medium">Capital</th>
            <th scope="col" class="py-1.5 text-right font-medium">Durée</th>
            <th scope="col" class="py-1.5 text-right font-medium">Intérêts</th>
            <th v-if="totalInsurance > 0" scope="col" class="py-1.5 pl-2 text-right font-medium">Assurance</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(loan, index) in loanSummaries" :key="index" class="border-b border-line/60 last:border-b-0">
            <th scope="row" class="py-2 pr-2 text-left font-normal text-ink">{{ loan.label }}</th>
            <td class="py-2 text-right figure text-ink">{{ formatEuros(loan.principal) }}</td>
            <td class="py-2 pl-2 text-right text-ink-2 whitespace-nowrap">{{ loan.duration }}</td>
            <td class="py-2 pl-2 text-right figure text-ink">{{ formatEuros(loan.interest) }}</td>
            <td v-if="totalInsurance > 0" class="py-2 pl-2 text-right figure text-ink">{{ formatEuros(loan.insurance) }}</td>
          </tr>
        </tbody>
      </table>

      <FundingBar class="mt-6" title="Total des mensualités" :total="totalPayments" :segments="costSegments">
        <template #after>
          <li v-if="applicationFees > 0" class="flex items-baseline justify-between gap-3 text-sm">
            <span class="text-ink-2 pl-[1.125rem]">Frais de dossier</span>
            <span class="figure text-ink">{{ formatEuros(applicationFees) }}</span>
          </li>
          <li v-if="totalPenalty > 0" class="flex items-baseline justify-between gap-3 text-sm">
            <span class="text-ink-2 pl-[1.125rem]">Indemnités de remboursement anticipé</span>
            <span class="figure text-ink">{{ formatEuros(totalPenalty) }}</span>
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
      <AmortizationTable v-if="isValid" :rows="amortizationTable" :loans="plan.loans" />
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
  summarizeByYear,
  INSURANCE_MODES,
  formatCurrency,
  formatEuros,
  formatDate,
  formatDuration,
  formatPercent,
  sanitizeMonths,
  MAX_RATE
} from '../services/loanCalculator.js'
import { USURY, usuryRateFor, isUsuryOutdated } from '../services/usury.js'
import { buildLoanPlan, paymentSteps, extraLoanName, isUsableLoan, MAX_EXTRA_LOANS } from '../services/multiLoan.js'
import { usePersistedState } from '../composables/usePersistedState.js'
import { useSavedSimulation } from '../composables/useSavedSimulation.js'
import AmortizationTable from './AmortizationTable.vue'
import CalculatorLayout from './CalculatorLayout.vue'
import CollapsibleSection from './CollapsibleSection.vue'
import DurationField from './DurationField.vue'
import EarlyRepayment from './EarlyRepayment.vue'
import ExtraLoans from './ExtraLoans.vue'
import FormField from './FormField.vue'
import FundingBar from './FundingBar.vue'
import InsuranceField from './InsuranceField.vue'
import NumberInput from './NumberInput.vue'
import PdfButton from './PdfButton.vue'
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
  usuryOverride: null,
  // Remboursement anticipé (inactif sans montant) : versé au bout de earlyAfterMonths mois
  earlyAmount: null,
  earlyAfterMonths: 60,
  earlyEffect: 'duration', // 'duration' | 'payment'
  earlyPenalty: true,
  // Changement de mensualité (inactif sans montant) : appliqué au bout de modulationAfterMonths mois
  modulationPayment: null,
  modulationAfterMonths: 24,
  // Prêts complémentaires : [{ type, principal, annualRate, months }], et lissage du total mensuel
  extraLoans: [],
  smoothing: false
})
const {
  principal, annualRate, months, insuranceRate, insuranceMode, insuranceQuota,
  applicationFees, guaranteeFees, usuryOverride,
  earlyAmount, earlyAfterMonths, earlyEffect, earlyPenalty, modulationPayment, modulationAfterMonths,
  extraLoans, smoothing
} = toRefs(state)

// Champs du remboursement anticipé et de la modulation, enregistrés et rechargés tels quels
const EVENT_FIELDS = ['earlyAmount', 'earlyAfterMonths', 'earlyEffect', 'earlyPenalty', 'modulationPayment', 'modulationAfterMonths']
const EVENT_DEFAULTS = { earlyAmount: null, earlyAfterMonths: 60, earlyEffect: 'duration', earlyPenalty: true, modulationPayment: null, modulationAfterMonths: 24 }

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
  guaranteeFees: guaranteeFees.value,
  ...Object.fromEntries(EVENT_FIELDS.map(key => [key, state[key]])),
  extraLoans: extraLoans.value,
  smoothing: smoothing.value
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
  // Absents avant la v2.6.6 : une simulation plus ancienne n'a ni remboursement anticipé ni modulation
  for (const key of EVENT_FIELDS) state[key] = loaded(key, state[key], EVENT_DEFAULTS[key])
  // Prêts complémentaires (absents avant la v2.7.0) : chaque champ est revalidé, la base pouvant contenir autre chose
  extraLoans.value = (Array.isArray(loaded('extraLoans', extraLoans.value, [])) ? loaded('extraLoans', extraLoans.value, []) : [])
    .slice(0, MAX_EXTRA_LOANS)
    .map(loan => ({
      type: typeof loan?.type === 'string' ? loan.type : 'other',
      principal: typeof loan?.principal === 'number' ? loan.principal : null,
      annualRate: typeof loan?.annualRate === 'number' ? loan.annualRate : null,
      months: sanitizeMonths(loan?.months)
    }))
  smoothing.value = Boolean(loaded('smoothing', smoothing.value, false))
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

// Événements en cours de prêt. « Au bout de N mois » : le remboursement suit l'échéance n° N,
// la nouvelle mensualité s'applique à partir de l'échéance n° N + 1.
const events = computed(() => ({
  earlyRepayment: earlyAmount.value > 0 && earlyAfterMonths.value >= 1
    ? { amount: earlyAmount.value, afterMonth: earlyAfterMonths.value, effect: earlyEffect.value, withPenalty: earlyPenalty.value }
    : null,
  modulation: modulationPayment.value > 0
    ? { payment: modulationPayment.value, fromMonth: (modulationAfterMonths.value || 0) + 1 }
    : null
}))
const hasEvents = computed(() => Boolean(events.value.earlyRepayment || events.value.modulation))

const insurance = computed(() => ({
  insuranceRate: insuranceRate.value,
  insuranceMode: insuranceMode.value,
  insuranceQuota: insuranceQuota.value
}))

// Tous les prêts : le principal (avec ses événements) et les prêts complémentaires, lissés ou non
const buildPlan = (planEvents) => buildLoanPlan({
  main: { principal: principal.value, annualRate: annualRate.value, months: months.value },
  extraLoans: extraLoans.value.map(loan => ({ ...loan, label: extraLoanName(loan) })),
  smoothing: smoothing.value,
  startDate: startDate.value,
  insurance: insurance.value,
  events: planEvents
})
const plan = computed(() => buildPlan(events.value))

// Le tableau de l'ensemble des prêts est la source de tous les totaux : il porte l'assurance de chaque
// échéance, qu'elle soit fixe (capital initial) ou dégressive (capital restant dû), et les événements du prêt.
const amortizationTable = computed(() => plan.value.combined)

// Les mêmes prêts sans événement : sert de référence pour chiffrer leur effet
const baselineTable = computed(() => (hasEvents.value ? buildPlan({}).combined : amortizationTable.value))

// Capital total emprunté, tous prêts confondus
const totalPrincipal = computed(() => plan.value.loans.reduce((sum, loan) => sum + loan.principal, 0))

// Paliers de la mensualité totale (assurance comprise) : plusieurs quand un prêt se termine avant les autres
const steps = computed(() => (plan.value.loans.length > 1 ? paymentSteps(amortizationTable.value, 'totalPayment') : []))

const loanSummaries = computed(() => plan.value.loans.map(loan => ({
  label: loan.label,
  principal: loan.principal,
  duration: formatDuration(loan.table.length),
  interest: Math.round(loan.table.reduce((sum, row) => sum + row.interestPart, 0) * 100) / 100,
  insurance: Math.round(loan.table.reduce((sum, row) => sum + row.insurancePart, 0) * 100) / 100
})))

const sumOf = (key) => Math.round(amortizationTable.value.reduce((sum, row) => sum + row[key], 0) * 100) / 100

// Première échéance : assurance et total du mois (les plus élevés en mode « restant dû »)
const monthlyInsurance = computed(() => amortizationTable.value[0]?.insurancePart ?? 0)
const monthlyTotal = computed(() => amortizationTable.value[0]?.totalPayment ?? 0)
const firstCreditPayment = computed(() => amortizationTable.value[0]?.payment ?? 0)

// Dernière échéance pleine (la toute dernière absorbe les arrondis) : sert à dire jusqu'où la mensualité baisse
const lastMonthlyTotal = computed(() => {
  const rows = amortizationTable.value
  return rows.length > 1 ? rows.at(-2).totalPayment : monthlyTotal.value
})

// Mensualité qui baisse de mois en mois du seul fait de l'assurance (un seul prêt, sans événement)
const isDecreasing = computed(() =>
  insuranceMode.value === 'crd' && monthlyInsurance.value > 0 && plan.value.loans.length === 1 && !hasEvents.value
)

const monthlyLabel = computed(() =>
  monthlyInsurance.value > 0 ? 'Mensualité, assurance comprise' : 'Mensualité'
)

const totalInterest = computed(() => sumOf('interestPart'))
const totalInsurance = computed(() => sumOf('insurancePart'))

const totalPayments = computed(() =>
  Math.round((totalPrincipal.value + totalInterest.value + totalInsurance.value) * 100) / 100
)

// Frais payés au départ, hors mensualités
const upfrontFees = computed(() => (applicationFees.value || 0) + (guaranteeFees.value || 0))

const totalPenalty = computed(() => sumOf('penalty'))

const creditCost = computed(() =>
  Math.round((totalInterest.value + totalInsurance.value + upfrontFees.value + totalPenalty.value) * 100) / 100
)

// Tout ce qui est versé chaque mois compte dans le TAEG, remboursement anticipé et indemnités compris
const taeg = computed(() =>
  calculateTAEG(
    totalPrincipal.value,
    upfrontFees.value,
    amortizationTable.value.map(row => row.totalPayment + row.extraPayment + row.penalty)
  )
)

// Effet des événements par rapport au prêt de référence
const eventsEffect = computed(() => {
  if (!hasEvents.value || !amortizationTable.value.length) return null
  const rows = amortizationTable.value
  const cost = (table) => table.reduce((sum, row) => sum + row.interestPart + row.insurancePart, 0)
  const saving = Math.round((cost(baselineTable.value) - cost(rows)) * 100) / 100
  // Mensualité de crédit une fois tous les événements passés (si le prêt n'est pas déjà soldé)
  const lastEvent = Math.max(events.value.earlyRepayment?.afterMonth ?? 0, (events.value.modulation?.fromMonth ?? 1) - 1)
  const after = rows[lastEvent]
  const newPayment = after && after.number < rows.length && after.payment !== rows[0].payment ? after.payment : null
  // La mensualité modulée ne dépasse pas les intérêts : le capital ne baisse plus
  const modulated = events.value.modulation && rows[events.value.modulation.fromMonth - 1]
  return {
    endLabel: formatDate(rows.at(-1).date),
    monthsDelta: rows.length - baselineTable.value.length,
    newPayment,
    saving,
    penalty: totalPenalty.value,
    net: Math.round((saving - totalPenalty.value) * 100) / 100,
    notAmortizing: Boolean(modulated && modulated.payment <= modulated.interestPart && rows.length > 1)
  }
})

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

// Synthèse PDF : les paramètres, le résultat, et le tableau par année
function buildPdf() {
  const hasInsurance = totalInsurance.value > 0
  const loanRows = [
    [plan.value.loans.length > 1 ? 'Prêt principal' : 'Montant emprunté', formatEuros(principal.value)],
    ['Taux annuel', formatPercent(annualRate.value)],
    ['Durée', formatDuration(months.value)],
    ['Première mensualité le', firstPaymentLabel.value]
  ]
  if (hasInsurance) {
    const mode = INSURANCE_MODES.find(m => m.value === insuranceMode.value)?.label.toLowerCase()
    loanRows.push(['Assurance', `${formatPercent(insuranceRate.value)} sur ${mode}, quotité ${formatPercent(insuranceQuota.value ?? 100)}`])
  }
  // Les prêts complémentaires du plan sont, dans l'ordre, ceux de la saisie qui sont complets
  const usableLoans = extraLoans.value.filter(isUsableLoan)
  for (const [index, loan] of plan.value.loans.slice(1).entries()) {
    const source = usableLoans[index]
    // Le taux d'assurance n'est rappelé que s'il diffère de celui du prêt principal
    const ownInsurance = typeof source?.insuranceRate === 'number' ? `, assurance ${formatPercent(source.insuranceRate)}` : ''
    loanRows.push([loan.label, `${formatEuros(loan.principal)} à ${formatPercent(source?.annualRate ?? 0)} sur ${formatDuration(loan.table.length)}${ownInsurance}`])
  }
  if (plan.value.smoothed) loanRows.push(['Mensualités', 'lissées sur l\'ensemble des prêts'])
  if (!plan.value.smoothed && events.value.earlyRepayment) {
    loanRows.push(['Remboursement anticipé', `${formatEuros(earlyAmount.value)} au bout de ${formatDuration(earlyAfterMonths.value)}`])
  }
  if (!plan.value.smoothed && events.value.modulation) {
    loanRows.push(['Changement de mensualité', `${formatCurrency(modulationPayment.value)} au bout de ${formatDuration(modulationAfterMonths.value || 0)}`])
  }

  const resultRows = [[hasInsurance ? 'Mensualité, assurance comprise' : 'Mensualité', formatCurrency(monthlyTotal.value)]]
  for (const step of steps.value.slice(1)) resultRows.push([`À partir du ${formatDate(step.date)}`, formatCurrency(step.amount)])
  resultRows.push(['Fin du prêt', formatDate(amortizationTable.value.at(-1).date)])
  resultRows.push(['Capital emprunté', formatEuros(totalPrincipal.value)])
  resultRows.push(['Intérêts', formatEuros(totalInterest.value)])
  if (hasInsurance) resultRows.push(['Assurance', formatEuros(totalInsurance.value)])
  if (applicationFees.value > 0) resultRows.push(['Frais de dossier', formatEuros(applicationFees.value)])
  if (guaranteeFees.value > 0) resultRows.push(['Frais de garantie', formatEuros(guaranteeFees.value)])
  if (totalPenalty.value > 0) resultRows.push(['Indemnités de remboursement anticipé', formatEuros(totalPenalty.value)])
  resultRows.push(['Coût du crédit', formatEuros(creditCost.value)])
  if (taeg.value !== null) resultRows.push(['TAEG', formatPercent(taeg.value)])

  const years = summarizeByYear(amortizationTable.value)
  return {
    title: current.value?.name || 'Simulation de prêt immobilier',
    subtitle: `Établie le ${formatDate(new Date())}`,
    sections: [
      { heading: 'Le prêt', rows: loanRows },
      { heading: 'Ce qu\'il coûte', rows: resultRows }
    ],
    table: {
      heading: 'Tableau d\'amortissement par année',
      head: ['Année', 'Restant dû', 'Capital', 'Intérêts', ...(hasInsurance ? ['Assurance'] : []), 'Payé'],
      body: years.map(y => [
        `An ${y.year}`, formatEuros(y.remainingPrincipal), formatEuros(y.principal), formatEuros(y.interest),
        ...(hasInsurance ? [formatEuros(y.insurance)] : []), formatEuros(y.total)
      ])
    },
    note: 'Simulation indicative, sans valeur contractuelle. Seule l\'offre de prêt de la banque fait foi.',
    filename: 'simulation-pret.pdf'
  }
}

const feesSummary = computed(() => (upfrontFees.value > 0 ? formatEuros(upfrontFees.value) : ''))

const costSegments = computed(() => [
  { key: 'capital', label: 'Capital emprunté', value: totalPrincipal.value || 0, color: 'capital' },
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
