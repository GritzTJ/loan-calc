<template>
  <CalculatorLayout
    title="Louer ou acheter"
    intro="À budget mensuel égal, quel choix vous laisse le plus de patrimoine ? Celui qui dépense le moins place la différence."
    :ready="isValid"
    empty-hint="Saisissez le prix du bien, le prêt et votre loyer pour comparer."
    resettable
    @reset="reset"
  >
    <template #summary>
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-sm text-ink-2">{{ verdictLabel }}</span>
        <span v-if="result.breakEvenYear > 1" class="figure text-lg text-ink">{{ yearsLabel(result.breakEvenYear) }}</span>
      </div>
    </template>

    <template #form>
      <FormField v-slot="{ id }" label="Prix du bien">
        <NumberInput :id="id" v-model="price" suffix="€" placeholder="250 000" />
      </FormField>

      <FormField v-slot="{ id }" label="Apport personnel">
        <NumberInput :id="id" v-model="contribution" suffix="€" placeholder="30 000" />
      </FormField>

      <FormField v-slot="{ id }" label="Taux du prêt">
        <NumberInput :id="id" v-model="annualRate" :decimals="2" :max="MAX_RATE" suffix="%" placeholder="3,50" />
      </FormField>

      <DurationField v-model="months" label="Durée du prêt" />

      <FormField v-slot="{ id }" label="Assurance du prêt" hint="(optionnel)">
        <NumberInput :id="id" v-model="insuranceRate" :decimals="2" :max="MAX_RATE" suffix="% / an" placeholder="0,30" />
      </FormField>

      <FormField label="Charges de propriétaire par an">
        <template #default="{ id }">
          <NumberInput :id="id" v-model="ownerCharges" suffix="€" placeholder="2 500" />
        </template>
        <template #help>Taxe foncière, charges de copropriété non récupérables, entretien.</template>
      </FormField>

      <NotaryRateField v-model:property-type="propertyType" v-model:dmto-rate="dmtoRate" />

      <h3 class="sm:col-span-2 lg:col-span-1 mt-2 pt-4 border-t border-line text-base font-semibold text-ink">En restant locataire</h3>

      <FormField v-slot="{ id }" label="Loyer mensuel actuel, charges comprises">
        <NumberInput :id="id" v-model="rent" suffix="€" placeholder="1 000" />
      </FormField>

      <FormField label="Hausse annuelle du loyer">
        <template #default="{ id }">
          <NumberInput :id="id" v-model="rentGrowth" :decimals="1" :max="20" suffix="%" placeholder="1,5" />
        </template>
        <template #help>Appliquée aussi aux charges de propriétaire.</template>
      </FormField>

      <CollapsibleSection title="Hypothèses" :summary="assumptionsSummary">
        <FormField v-slot="{ id }" label="Valorisation annuelle du bien">
          <NumberInput :id="id" v-model="appreciation" :decimals="1" :max="20" suffix="%" placeholder="1" />
        </FormField>

        <FormField label="Rendement annuel de l'épargne">
          <template #default="{ id }">
            <NumberInput :id="id" v-model="savingsReturn" :decimals="1" :max="20" suffix="%" placeholder="3" />
          </template>
          <template #help>Net de frais et d'impôts, pour l'argent placé par celui qui dépense le moins.</template>
        </FormField>

        <FormField v-slot="{ id }" label="Durée de la projection">
          <NumberInput :id="id" v-model="horizonYears" :min="1" :max="MAX_HORIZON_YEARS" suffix="ans" placeholder="25" />
        </FormField>
      </CollapsibleSection>
    </template>

    <template #result>
      <p class="text-sm text-ink-2">{{ verdictLabel }}</p>
      <p v-if="result.breakEvenYear > 1" class="figure text-hero text-ink mt-1.5">{{ yearsLabel(result.breakEvenYear) }}</p>
      <p class="mt-2 text-sm text-ink-2">
        Après {{ yearsLabel(last.year) }} : <span class="figure text-ink">{{ formatEuros(last.buy) }}</span> de patrimoine en achetant,
        <span class="figure text-ink">{{ formatEuros(last.rent) }}</span> en louant.
      </p>
      <p class="mt-1 text-sm text-ink-3">
        Emprunt de {{ formatEuros(result.loanAmount) }}, soit {{ formatCurrency(result.monthlyPayment) }} par mois,
        frais de notaire de {{ formatEuros(result.notaryFees) }} compris.
      </p>

      <h4 class="mt-6 mb-2 text-sm font-medium text-ink">Patrimoine net année après année</h4>
      <NetWorthChart :years="result.years" />

      <div class="overflow-x-auto mt-5">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-ink-2 border-b border-line">
              <th scope="col" class="py-2 text-left font-medium">Au bout de</th>
              <th scope="col" class="py-2 pl-3 text-right font-medium">En achetant</th>
              <th scope="col" class="py-2 pl-3 text-right font-medium">En louant</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="y in milestones" :key="y.year" class="border-b border-line/60 last:border-b-0">
              <th scope="row" class="py-2 text-left font-normal text-ink-2">{{ yearsLabel(y.year) }}</th>
              <td class="py-2 pl-3 text-right figure text-ink" :class="{ 'font-bold': y.buy >= y.rent }">{{ formatEuros(y.buy) }}</td>
              <td class="py-2 pl-3 text-right figure text-ink" :class="{ 'font-bold': y.rent > y.buy }">{{ formatEuros(y.rent) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-xs text-ink-3">
        Le patrimoine le plus élevé est en gras. Ne sont pas comptés : les frais de revente, la fiscalité de l'épargne
        et les gros travaux. Le résultat dépend surtout des hypothèses de valorisation et de rendement.
      </p>
    </template>
  </CalculatorLayout>
</template>

<script setup>
import { computed, toRefs } from 'vue'
import { formatCurrency, formatEuros, formatPercent, MAX_RATE } from '../services/loanCalculator.js'
import { DEFAULT_DMTO } from '../services/notaryFees.js'
import { compareRentAndBuy, MAX_HORIZON_YEARS } from '../services/rentVsBuy.js'
import { usePersistedState } from '../composables/usePersistedState.js'
import CalculatorLayout from './CalculatorLayout.vue'
import CollapsibleSection from './CollapsibleSection.vue'
import DurationField from './DurationField.vue'
import FormField from './FormField.vue'
import NetWorthChart from './NetWorthChart.vue'
import NotaryRateField from './NotaryRateField.vue'
import NumberInput from './NumberInput.vue'

// Exemple de départ, puis saisie conservée d'une visite à l'autre
const { state, reset } = usePersistedState('rent-vs-buy', {
  price: 250000,
  contribution: 30000,
  annualRate: 3.5,
  months: 240,
  insuranceRate: null,
  ownerCharges: 2500,
  propertyType: 'ancien',
  dmtoRate: DEFAULT_DMTO,
  rent: 1000,
  rentGrowth: 1.5,
  appreciation: 1,
  savingsReturn: 3,
  horizonYears: 25
})
const {
  price, contribution, annualRate, months, insuranceRate, ownerCharges, propertyType, dmtoRate,
  rent, rentGrowth, appreciation, savingsReturn, horizonYears
} = toRefs(state)

const isValid = computed(() =>
  price.value > 0 && typeof annualRate.value === 'number' && annualRate.value >= 0 && months.value > 0 && rent.value >= 0 && rent.value !== null
)

const result = computed(() => compareRentAndBuy({
  price: price.value || 0,
  contribution: contribution.value || 0,
  propertyType: propertyType.value,
  dmtoRate: dmtoRate.value,
  annualRate: annualRate.value || 0,
  months: months.value || 0,
  insuranceRate: insuranceRate.value || 0,
  ownerCharges: ownerCharges.value || 0,
  rent: rent.value || 0,
  rentGrowth: rentGrowth.value || 0,
  appreciation: appreciation.value || 0,
  savingsReturn: savingsReturn.value || 0,
  horizonYears: horizonYears.value || 25
}))

const last = computed(() => result.value.years.at(-1))

const yearsLabel = (years) => `${years} an${years > 1 ? 's' : ''}`

const verdictLabel = computed(() => {
  const year = result.value.breakEvenYear
  if (year === null) return `Sur ${yearsLabel(last.value.year)}, louer reste plus avantageux.`
  if (year === 1) return 'Acheter est plus avantageux dès la première année.'
  return 'Acheter devient plus avantageux au bout de'
})

// Tous les 5 ans, plus l'année de bascule et la dernière
const milestones = computed(() => {
  const wanted = new Set([result.value.breakEvenYear, last.value.year])
  return result.value.years.filter(y => y.year % 5 === 0 || wanted.has(y.year))
})

const assumptionsSummary = computed(() =>
  `bien ${formatPercent(appreciation.value || 0)}, épargne ${formatPercent(savingsReturn.value || 0)}, ${yearsLabel(horizonYears.value || 25)}`
)
</script>
