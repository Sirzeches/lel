import { formatMoney } from './money'
import type { SplitResult } from './types'

/** Plain-text summary suitable for pasting into a group chat. */
export function summaryText(result: SplitResult, currency: string, title = 'Bill split'): string {
  const fmt = (c: number) => formatMoney(c, currency)
  const lines = [`🧾 ${title} — total ${fmt(result.grandTotal)}`, '']
  for (const s of result.shares) {
    lines.push(`${s.person.name}: ${fmt(s.total)}`)
    for (const { item, share } of s.items) {
      const n = item.assignees.length
      lines.push(`  • ${item.name}${n > 1 ? ` (split ${n} ways)` : ''} ${fmt(share)}`)
    }
    for (const { extra, share } of s.extras) {
      if (share !== 0) lines.push(`  • ${extra.label} ${fmt(share)}`)
    }
  }
  return lines.join('\n')
}
