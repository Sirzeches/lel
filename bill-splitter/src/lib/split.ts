import { allocate } from './money'
import type { Bill, Item, PersonShare, SplitResult } from './types'

/**
 * Work out what each person owes.
 *
 * - Each item is split equally among the people assigned to it.
 * - Bill-wide extras (tax, tip, service charge, discounts) are split either in
 *   proportion to each person's item subtotal, or equally across everyone.
 * - Every split is done in whole cents and always adds back up to the exact amount.
 */
export function computeSplit(bill: Bill): SplitResult {
  const { people, items, extras } = bill
  const shares: PersonShare[] = people.map((person) => ({
    person,
    items: [],
    subtotal: 0,
    extras: [],
    total: 0,
  }))
  const indexById = new Map(people.map((p, i) => [p.id, i]))

  const unassigned: Item[] = []
  let itemsTotal = 0
  items.forEach((item, itemIndex) => {
    itemsTotal += item.price
    const idx = item.assignees.map((id) => indexById.get(id)).filter((i): i is number => i !== undefined)
    if (idx.length === 0) {
      unassigned.push(item)
      return
    }
    const parts = allocate(item.price, idx.map(() => 1), itemIndex)
    idx.forEach((personIndex, k) => {
      shares[personIndex].items.push({ item, share: parts[k] })
      shares[personIndex].subtotal += parts[k]
    })
  })

  let extrasTotal = 0
  extras.forEach((extra, extraIndex) => {
    extrasTotal += extra.amount
    if (shares.length === 0) return
    const weights = bill.extrasMode === 'equal' ? shares.map(() => 1) : shares.map((s) => s.subtotal)
    const parts = allocate(extra.amount, weights, extraIndex)
    shares.forEach((s, k) => {
      if (parts[k] !== 0 || weights[k] !== 0) s.extras.push({ extra, share: parts[k] })
    })
  })

  for (const s of shares) {
    s.total = s.subtotal + s.extras.reduce((a, e) => a + e.share, 0)
  }

  return {
    shares,
    itemsTotal,
    extrasTotal,
    grandTotal: itemsTotal + extrasTotal,
    unassigned,
  }
}
