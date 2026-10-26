import { useMemo, useState } from 'react'
import { Nav, type StepProps } from '../components'
import { formatMoney } from '../lib/money'
import { computeSplit } from '../lib/split'
import { summaryText } from '../lib/summary'

export function SummaryStep({ bill, onBack, onRestart }: Omit<StepProps, 'update' | 'onNext'> & { onRestart: () => void }) {
  const fmt = (c: number) => formatMoney(c, bill.currency)
  const result = useMemo(() => computeSplit(bill), [bill])
  const [copied, setCopied] = useState(false)
  const text = summaryText(result, bill.currency)
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy the summary:', text)
    }
  }

  return (
    <section className="step">
      <h2>Who owes what</h2>
      <div className="grand-card">
        <span>Bill total</span>
        <strong>{fmt(result.grandTotal)}</strong>
        <span className="small">
          {bill.people.length} {bill.people.length === 1 ? 'person' : 'people'} · {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <ul className="shares">
        {result.shares.map((s) => (
          <li key={s.person.id} className="share-card">
            <details>
              <summary>
                <span className="avatar">{s.person.name.slice(0, 1).toUpperCase()}</span>
                <span className="grow">{s.person.name}</span>
                <strong>{fmt(s.total)}</strong>
              </summary>
              <table>
                <tbody>
                  {s.items.map(({ item, share }) => (
                    <tr key={item.id}>
                      <td>
                        {item.name}
                        {item.assignees.length > 1 && <span className="muted small"> · split {item.assignees.length} ways</span>}
                      </td>
                      <td>{fmt(share)}</td>
                    </tr>
                  ))}
                  {s.extras.length > 0 && (
                    <tr className="sub">
                      <td>Subtotal</td>
                      <td>{fmt(s.subtotal)}</td>
                    </tr>
                  )}
                  {s.extras.map(({ extra, share }) => (
                    <tr key={extra.id}>
                      <td>{extra.label}</td>
                      <td>{fmt(share)}</td>
                    </tr>
                  ))}
                  <tr className="sub">
                    <td>Total</td>
                    <td>{fmt(s.total)}</td>
                  </tr>
                </tbody>
              </table>
            </details>
          </li>
        ))}
      </ul>

      <div className="row wrap">
        <button className="btn primary" onClick={copy}>
          {copied ? '✓ Copied' : 'Copy summary'}
        </button>
        {canShare && (
          <button className="btn" onClick={() => navigator.share({ title: 'Bill split', text }).catch(() => {})}>
            Share…
          </button>
        )}
      </div>

      <Nav onBack={onBack} onNext={onRestart} nextLabel="New bill" />
    </section>
  )
}
