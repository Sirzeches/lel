import { describe, expect, it } from 'vitest'
import { allocate, parseAmount } from './money'
import { parseReceiptText } from './parser'
import { computeSplit } from './split'
import type { Bill } from './types'

describe('parseAmount', () => {
  it.each([
    ['12.50', 1250],
    ['$1,234.56', 123456],
    ['4,50', 450],
    ['1.234,56', 123456],
    ['7', 700],
    ['-3.2', -320],
    ['abc', null],
  ])('%s -> %s', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })
})

describe('allocate', () => {
  it('always sums to the total', () => {
    expect(allocate(1000, [1, 1, 1])).toEqual([334, 333, 333])
    expect(allocate(1000, [1, 1, 1]).reduce((a, b) => a + b)).toBe(1000)
  })

  it('splits proportionally', () => {
    expect(allocate(300, [2000, 1000])).toEqual([200, 100])
  })

  it('falls back to equal when all weights are zero', () => {
    expect(allocate(100, [0, 0])).toEqual([50, 50])
  })

  it('handles negative totals (discounts)', () => {
    expect(allocate(-1000, [1, 1, 1])).toEqual([-334, -333, -333])
  })

  it('rotates leftover cents with the tie offset', () => {
    expect(allocate(100, [1, 1, 1], 1)).toEqual([33, 34, 33])
  })
})

describe('parseReceiptText', () => {
  const receipt = `
    THE CORNER BISTRO
    123 Main St  Tel 555-1234
    10/26/2026 7:42 PM   Table 4
    2 x Cheeseburger        25.00
    Caesar Salad            $11.50
    1 Iced Tea               3.25 T
    FRIES ........... 4.75
    Senior Discount          -2.00
    SUBTOTAL                42.50
    Sales Tax 8%             3.40
    Service Charge           4.25
    TOTAL                   50.15
    VISA ****1234           50.15
    CHANGE                   0.00
  `

  it('extracts items, quantities and extras', () => {
    const r = parseReceiptText(receipt)
    expect(r.items).toEqual([
      { name: 'Cheeseburger', price: 2500, quantity: 2 },
      { name: 'Caesar Salad', price: 1150, quantity: 1 },
      { name: 'Iced Tea', price: 325, quantity: 1 },
      { name: 'Fries', price: 475, quantity: 1 },
    ])
    expect(r.extras).toEqual([
      { kind: 'discount', label: 'Senior Discount', amount: -200 },
      { kind: 'tax', label: 'Sales Tax 8%', amount: 340 },
      { kind: 'service', label: 'Service charge', amount: 425 },
    ])
    expect(r.subtotal).toBe(4250)
    expect(r.total).toBe(5015)
  })

  it('handles unit price columns and ignores VAT basis lines', () => {
    const r = parseReceiptText(`
      Coke 2 @ 1.50          3.00
      Pancit Canton         180.00
      VATable Sales         160.71
      VAT 12%                19.29
      Total Amount Due      180.00
    `)
    expect(r.items).toEqual([
      { name: 'Coke 2', price: 300, quantity: 1 },
      { name: 'Pancit Canton', price: 18000, quantity: 1 },
    ])
    expect(r.extras).toEqual([{ kind: 'tax', label: 'Vat 12%', amount: 1929 }])
    expect(r.total).toBe(18000)
  })
})

describe('computeSplit', () => {
  const people = [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Ben' },
    { id: 'c', name: 'Cy' },
  ]
  const base: Bill = {
    currency: 'USD',
    people,
    receiptTotal: null,
    extrasMode: 'proportional',
    items: [
      { id: '1', name: 'Pizza', price: 3000, quantity: 1, assignees: ['a', 'b', 'c'] },
      { id: '2', name: 'Steak', price: 3000, quantity: 1, assignees: ['a'] },
      { id: '3', name: 'Wine', price: 1000, quantity: 1, assignees: ['b', 'c'] },
    ],
    extras: [{ id: 't', kind: 'tax', label: 'Tax', amount: 700 }],
  }

  it('splits shared items and distributes extras proportionally', () => {
    const r = computeSplit(base)
    const totals = r.shares.map((s) => [s.person.name, s.subtotal, s.total])
    expect(totals).toEqual([
      ['Ana', 4000, 4400],
      ['Ben', 1500, 1650],
      ['Cy', 1500, 1650],
    ])
    expect(r.grandTotal).toBe(7700)
    expect(r.shares.reduce((a, s) => a + s.total, 0)).toBe(r.grandTotal)
  })

  it('can split extras equally', () => {
    const r = computeSplit({ ...base, extrasMode: 'equal' })
    expect(r.shares.map((s) => s.total)).toEqual([4234, 1733, 1733])
  })

  it('reports unassigned items', () => {
    const r = computeSplit({
      ...base,
      items: [...base.items, { id: '4', name: 'Dessert', price: 800, quantity: 1, assignees: [] }],
    })
    expect(r.unassigned.map((i) => i.name)).toEqual(['Dessert'])
  })

  it('never loses a cent on awkward splits', () => {
    const r = computeSplit({
      ...base,
      items: [{ id: '1', name: 'Odd', price: 1001, quantity: 1, assignees: ['a', 'b', 'c'] }],
      extras: [
        { id: 't', kind: 'tax', label: 'Tax', amount: 97 },
        { id: 'd', kind: 'discount', label: 'Promo', amount: -101 },
      ],
    })
    expect(r.shares.reduce((a, s) => a + s.total, 0)).toBe(1001 + 97 - 101)
  })
})
