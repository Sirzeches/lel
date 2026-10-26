/** All money values are stored as integer cents (minor units) to avoid float drift. */
export type Cents = number

export interface Person {
  id: string
  name: string
}

export interface Item {
  id: string
  name: string
  /** Line total for this item (unit price × quantity). */
  price: Cents
  quantity: number
  /** Ids of the people sharing this item. Empty means not yet assigned. */
  assignees: string[]
}

export type ExtraKind = 'tax' | 'tip' | 'service' | 'discount' | 'other'

/** A bill-wide charge (or discount, when negative) shared across people. */
export interface Extra {
  id: string
  kind: ExtraKind
  label: string
  amount: Cents
}

export type ExtrasMode = 'proportional' | 'equal'

export interface Bill {
  currency: string
  items: Item[]
  extras: Extra[]
  extrasMode: ExtrasMode
  /** Total printed on the receipt, if one was detected, for cross-checking. */
  receiptTotal: Cents | null
  people: Person[]
}

export interface PersonShare {
  person: Person
  items: { item: Item; share: Cents }[]
  subtotal: Cents
  extras: { extra: Extra; share: Cents }[]
  total: Cents
}

export interface SplitResult {
  shares: PersonShare[]
  itemsTotal: Cents
  extrasTotal: Cents
  grandTotal: Cents
  unassigned: Item[]
}
