import { describe, it, expect } from 'vitest'
import { parseNumberInput } from './numberParsing.js'

const value = (text, decimals) => parseNumberInput(text, decimals).value

describe('parseNumberInput', () => {
  it('lit les séparateurs de milliers usuels dans un champ entier', () => {
    expect(value('200000')).toBe(200000)
    expect(value('200 000')).toBe(200000)
    expect(value('200 000')).toBe(200000)
    expect(value('200.000')).toBe(200000)
    expect(value('1.234.567')).toBe(1234567)
    expect(value('1,234,567')).toBe(1234567)
  })

  it('lit les deux conventions décimales', () => {
    expect(value('3,5', 2)).toBe(3.5)
    expect(value('3.5', 2)).toBe(3.5)
    expect(value('1.234,56', 2)).toBe(1234.56)
    expect(value('1,234.56', 2)).toBe(1234.56)
    expect(value('1 234,56', 2)).toBe(1234.56)
  })

  it('garde « 3.500 » comme un taux dans un champ décimal', () => {
    expect(value('3.500', 2)).toBe(3.5)
  })

  it('arrondit au nombre de décimales du champ', () => {
    expect(value('3,456', 2)).toBe(3.46)
  })

  it('écarte les décimales d\'un champ entier et le signale', () => {
    expect(parseNumberInput('3,5')).toEqual({ value: 3, rewritten: true })
    expect(parseNumberInput('3,')).toEqual({ value: 3, rewritten: true })
    expect(parseNumberInput('1.234,56')).toEqual({ value: 1234, rewritten: true })
    expect(parseNumberInput('240')).toEqual({ value: 240, rewritten: false })
  })

  it('renvoie null pour ce qui n\'est pas un nombre', () => {
    expect(value('')).toBe(null)
    expect(value('abc')).toBe(null)
    expect(value('12abc')).toBe(null)
    expect(value(',')).toBe(null)
    expect(value('-')).toBe(null)
  })

  it('accepte une saisie décimale en cours', () => {
    expect(value('3,', 2)).toBe(3)
    expect(value(',5', 2)).toBe(0.5)
  })
})
