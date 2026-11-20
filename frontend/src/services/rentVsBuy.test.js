import { describe, it, expect } from 'vitest'
import { compareRentAndBuy } from './rentVsBuy.js'

const noFees = { notaryFeesOf: () => 0 }

describe('compareRentAndBuy', () => {
  // Cas témoin calculable à la main : prêt à 0 %, pas de frais, pas de valorisation, épargne à 0 %,
  // loyer égal à la mensualité (1 000 €). Personne ne place rien.
  it('cas témoin : l\'acheteur accumule le capital remboursé, le locataire garde son apport', () => {
    const r = compareRentAndBuy({ ...noFees, price: 240000, contribution: 0, annualRate: 0, months: 240, rent: 1000, horizonYears: 20 })
    expect(r.loanAmount).toBe(240000)
    expect(r.monthlyPayment).toBe(1000)
    expect(r.years[0]).toMatchObject({ year: 1, buy: 12000, rent: 0 })
    expect(r.years[9].buy).toBe(120000)
    expect(r.years[19]).toMatchObject({ buy: 240000, rent: 0 })
    expect(r.breakEvenYear).toBe(1)
  })

  // Sans loyer, le locataire place chaque mois ce que l'acheteur verse à la banque : à 0 %, égalité stricte
  it('cas témoin : sans loyer et à 0 %, les deux patrimoines sont égaux', () => {
    const r = compareRentAndBuy({ ...noFees, price: 240000, contribution: 40000, annualRate: 0, months: 240, rent: 0, horizonYears: 20 })
    expect(r.loanAmount).toBe(200000)
    for (const y of r.years) expect(Math.abs(y.buy - y.rent)).toBeLessThan(0.5)
  })

  it('les frais de notaire sont perdus pour l\'acheteur dès le départ', () => {
    const r = compareRentAndBuy({ notaryFeesOf: () => 20000, price: 240000, contribution: 40000, annualRate: 0, months: 240, rent: 0, horizonYears: 5 })
    // Emprunt = prix + notaire − apport ; le locataire garde 40 000 € et place les mensualités
    expect(r.loanAmount).toBe(220000)
    expect(r.years[0].rent - r.years[0].buy).toBeCloseTo(20000, 0)
  })

  it('une fois le prêt soldé, l\'acheteur place ce que le locataire paie en loyer', () => {
    const r = compareRentAndBuy({ ...noFees, price: 120000, contribution: 0, annualRate: 0, months: 120, rent: 1000, horizonYears: 12 })
    expect(r.years[9].buy).toBe(120000)
    // Années 11 et 12 : plus de mensualité, 1 000 € placés chaque mois
    expect(r.years[11].buy).toBe(144000)
    expect(r.years[11].rent).toBe(0)
  })

  it('un loyer bas et une épargne rentable peuvent rendre la location durablement gagnante', () => {
    const r = compareRentAndBuy({ price: 300000, contribution: 60000, annualRate: 4, months: 300, rent: 600, savingsReturn: 6, appreciation: 0, horizonYears: 25 })
    expect(r.breakEvenYear).toBe(null)
  })

  it('un loyer élevé rend l\'achat gagnant après quelques années (le temps d\'amortir les frais)', () => {
    const r = compareRentAndBuy({ price: 250000, contribution: 30000, annualRate: 3.5, months: 240, rent: 1300, rentGrowth: 1.5, appreciation: 1.5, savingsReturn: 3, ownerCharges: 2500, horizonYears: 25 })
    expect(r.breakEvenYear).toBeGreaterThan(1)
    expect(r.breakEvenYear).toBeLessThan(15)
    expect(r.years.at(-1).buy).toBeGreaterThan(r.years.at(-1).rent)
  })

  it('borne l\'horizon et applique la valorisation du bien', () => {
    const r = compareRentAndBuy({ ...noFees, price: 100000, contribution: 100000, annualRate: 0, months: 12, rent: 0, appreciation: 10, horizonYears: 500 })
    expect(r.years).toHaveLength(40)
    expect(r.years[0].propertyValue).toBe(110000)
  })
})
