import type { Cents } from './types'

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'PHP', 'AUD', 'CAD', 'SGD', 'JPY', 'INR', 'MYR', 'NZD', 'HKD'] as const

/** Format integer cents as a localized currency string. */
export function formatMoney(cents: Cents, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

/**
 * Parse a user- or OCR-supplied amount ("12.50", "$1,234.5", "4,50", "-3") into cents.
 * Returns null when the text is not a number.
 */
export function parseAmount(raw: string): Cents | null {
  let s = raw.trim().replace(/[^\d.,\-]/g, '')
  if (!s || !/\d/.test(s)) return null
  const negative = s.startsWith('-')
  s = s.replace(/-/g, '')

  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  const sepIndex = Math.max(lastDot, lastComma)
  let whole = s
  let frac = ''
  // A separator followed by 1–2 digits is a decimal point; otherwise it's a thousands separator.
  if (sepIndex !== -1 && s.length - sepIndex - 1 <= 2) {
    whole = s.slice(0, sepIndex)
    frac = s.slice(sepIndex + 1)
  }
  whole = whole.replace(/[.,]/g, '') || '0'
  const cents = parseInt(whole, 10) * 100 + parseInt(frac.padEnd(2, '0') || '0', 10)
  if (!Number.isFinite(cents)) return null
  return negative ? -cents : cents
}

/** Render cents as a plain editable number string, e.g. 1250 -> "12.50". */
export function centsToInput(cents: Cents): string {
  return (cents / 100).toFixed(2)
}

/**
 * Split `total` into integer parts proportional to `weights`, so the parts always sum
 * exactly to `total` (largest-remainder method). With all-zero weights it splits equally.
 * `tieOffset` rotates who receives leftover cents on ties so the same person isn't always
 * the one paying the extra cent.
 */
export function allocate(total: Cents, weights: number[], tieOffset = 0): Cents[] {
  const n = weights.length
  if (n === 0) return []
  if (total < 0) return allocate(-total, weights, tieOffset).map((v) => -v || 0)

  const sum = weights.reduce((a, b) => a + b, 0)
  const w = sum > 0 ? weights : weights.map(() => 1)
  const wSum = sum > 0 ? sum : n

  const exact = w.map((x) => (total * x) / wSum)
  const parts = exact.map(Math.floor)
  let leftover = total - parts.reduce((a, b) => a + b, 0)

  const order = exact
    .map((x, i) => ({ i, rem: x - Math.floor(x), rank: (i - tieOffset + n * 1000) % n }))
    .sort((a, b) => b.rem - a.rem || a.rank - b.rank)
  for (let k = 0; leftover > 0; k++, leftover--) parts[order[k % n].i] += 1
  return parts
}
