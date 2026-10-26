import { parseAmount } from './money'
import type { Cents, ExtraKind } from './types'

export interface ParsedItem {
  name: string
  price: Cents
  quantity: number
}

export interface ParsedExtra {
  kind: ExtraKind
  label: string
  amount: Cents
}

export interface ParsedReceipt {
  items: ParsedItem[]
  extras: ParsedExtra[]
  subtotal: Cents | null
  total: Cents | null
}

// A price at the end of a line: optional minus/currency, digits, a 2-digit decimal part,
// and optionally a trailing tax-code letter or two (e.g. "12.50 A", "$4.00 T", "3.00-").
const TRAILING_PRICE =
  /(-)?(?:(?:[$€£¥₱₹]|RM|PHP|USD|EUR)\s*)?(-)?(\d{1,3}(?:[,.]\d{3})+|\d+)\s?[.,]\s?(\d{2})\s*(-)?\s*(?:[A-Z*]{1,2})?\s*$/i

// Lines we never want to treat as items.
const IGNORE =
  /\b(change|cash|tender(ed)?|card|visa|master\s*card|amex|debit|credit|payment|paid|balance|amount\s*due|auth|approval|ref(erence)?|txn|transaction|tel|phone|vat\s*reg|tin|invoice|receipt\s*no|order\s*no|table|server|cashier|guests?|items?\s*count|no\.?\s*of\s*items|rounding|points|loyalty|savings)\b/i

const SUBTOTAL = /\b(sub[\s-]?total|subttl|net\s*total|food\s*total)\b/i
const TOTAL = /\b(grand\s*total|total(\s*amount)?|amount|ttl|total\s*due)\b/i
const TAX = /\b(tax|vat|gst|hst|pst|sales\s*tax)\b/i
const TIP = /\b(tip|gratuity)\b/i
const SERVICE = /\b(service\s*(charge|chg|fee)?|svc|s\/c)\b/i
const DISCOUNT = /\b(discount|disc|promo|coupon|voucher|off|senior|pwd|less)\b/i

// Things like "VAT 12%" or "VATable sales" describe the tax basis, not a charge.
const TAX_BASIS = /\b(vatable|vat[\s-]*exempt|zero[\s-]*rated|taxable|non[\s-]*taxable|vat\s*inclusive|incl(\.|usive)?)\b/i

/** Pull "2 x Burger", "2X Burger", "Burger x2" style quantities out of a name. */
function extractQuantity(name: string): { name: string; quantity: number } {
  const lead = name.match(/^(\d{1,2})\s*(?:[xX@*]\s*|\s+)(.+)$/)
  if (lead && !/^\d/.test(lead[2])) return { name: lead[2], quantity: parseInt(lead[1], 10) }
  const trail = name.match(/^(.+?)\s+[xX@]\s*(\d{1,2})$/)
  if (trail) return { name: trail[1], quantity: parseInt(trail[2], 10) }
  return { name, quantity: 1 }
}

function cleanName(raw: string): string {
  return (
    raw
      // Drop any trailing unit-price columns ("2 Coke 1.50 3.00" -> "2 Coke").
      .replace(/(\s+[$€£¥₱₹]?\d+[.,]\d{2}(\s*(ea|each|@))?)+\s*$/i, '')
      .replace(/\s+@\s*$/, '')
      .replace(/[|_~]+/g, ' ')
      .replace(/^[\s\-–•*.:]+|[\s\-–•*.:]+$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  )
}

function titleCase(s: string): string {
  // OCR'd receipts are often ALL CAPS; make them easier to read.
  if (s !== s.toUpperCase()) return s
  return s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase())
}

/**
 * Turn raw OCR text from a receipt into line items plus bill-wide charges.
 * The result is a best guess — the UI always lets the user correct it.
 */
export function parseReceiptText(text: string): ParsedReceipt {
  const items: ParsedItem[] = []
  const extras: ParsedExtra[] = []
  let subtotal: Cents | null = null
  let total: Cents | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, ' ').trim()
    if (!line) continue

    const m = line.match(TRAILING_PRICE)
    if (!m || m.index === undefined) continue

    const negative = Boolean(m[1] || m[2] || m[5])
    const amount = parseAmount(`${m[3]}.${m[4]}`)
    if (amount === null) continue
    const label = line.slice(0, m.index).trim()
    const signed = negative ? -amount : amount

    if (SUBTOTAL.test(label)) {
      subtotal = amount
      continue
    }
    if (TAX.test(label) && !TAX_BASIS.test(label)) {
      if (amount > 0) extras.push({ kind: 'tax', label: titleCase(cleanName(label)) || 'Tax', amount })
      continue
    }
    if (TIP.test(label)) {
      if (amount > 0) extras.push({ kind: 'tip', label: 'Tip', amount })
      continue
    }
    if (SERVICE.test(label)) {
      if (amount > 0) extras.push({ kind: 'service', label: 'Service charge', amount })
      continue
    }
    if (DISCOUNT.test(label) && !TOTAL.test(label)) {
      if (amount > 0) extras.push({ kind: 'discount', label: titleCase(cleanName(label)) || 'Discount', amount: -amount })
      continue
    }
    if (TOTAL.test(label)) {
      // Keep the first plain "total"; later ones are usually tendered/change amounts.
      if (total === null) total = amount
      continue
    }
    if (IGNORE.test(label) || TAX_BASIS.test(label)) continue

    const name = cleanName(label)
    // Need at least a couple of letters to be a real item name (filters dates, ids, etc).
    if ((name.match(/\p{L}/gu) ?? []).length < 2) continue

    const q = extractQuantity(name)
    items.push({ name: titleCase(q.name), price: signed, quantity: q.quantity })
  }

  return { items, extras, subtotal, total }
}
