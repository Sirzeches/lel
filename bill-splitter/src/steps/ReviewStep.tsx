import { MoneyInput, Nav, type StepProps } from '../components'
import { CURRENCIES, formatMoney } from '../lib/money'
import { uid } from '../lib/state'
import type { Extra, ExtraKind, Item } from '../lib/types'

const EXTRA_PRESETS: { kind: ExtraKind; label: string }[] = [
  { kind: 'tax', label: 'Tax' },
  { kind: 'tip', label: 'Tip' },
  { kind: 'service', label: 'Service charge' },
  { kind: 'discount', label: 'Discount' },
]
const TIP_PERCENTS = [10, 15, 18, 20]

export function ReviewStep({ bill, update, onNext, onBack, ocrText }: StepProps & { ocrText: string }) {
  const fmt = (c: number) => formatMoney(c, bill.currency)
  const itemsTotal = bill.items.reduce((a, i) => a + i.price, 0)
  const extrasTotal = bill.extras.reduce((a, e) => a + e.amount, 0)
  const grandTotal = itemsTotal + extrasTotal
  const mismatch = bill.receiptTotal !== null && bill.receiptTotal !== grandTotal

  const setItem = (id: string, patch: Partial<Item>) =>
    update((b) => ({ ...b, items: b.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
  const setExtra = (id: string, patch: Partial<Extra>) =>
    update((b) => ({ ...b, extras: b.extras.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))

  function addItem() {
    update((b) => ({ ...b, items: [...b.items, { id: uid(), name: '', price: 0, quantity: 1, assignees: [] }] }))
  }

  /** Turn "3 × Beer" into three separate beers so different people can claim them. */
  function splitUnits(item: Item) {
    const n = item.quantity
    const base = Math.floor(item.price / n)
    const rest = item.price - base * n
    const units: Item[] = Array.from({ length: n }, (_, k) => ({
      id: uid(),
      name: `${item.name} (${k + 1}/${n})`,
      price: base + (k < rest ? 1 : 0),
      quantity: 1,
      assignees: item.assignees,
    }))
    update((b) => ({ ...b, items: b.items.flatMap((i) => (i.id === item.id ? units : [i])) }))
  }

  function addExtra(kind: ExtraKind, label: string) {
    update((b) => ({ ...b, extras: [...b.extras, { id: uid(), kind, label, amount: 0 }] }))
  }

  function setTipPercent(pct: number) {
    const amount = Math.round((itemsTotal * pct) / 100)
    update((b) => {
      const existing = b.extras.find((e) => e.kind === 'tip')
      const tip = { id: existing?.id ?? uid(), kind: 'tip' as const, label: `Tip (${pct}%)`, amount }
      return { ...b, extras: existing ? b.extras.map((e) => (e.id === existing.id ? tip : e)) : [...b.extras, tip] }
    })
  }

  const validItems = bill.items.filter((i) => i.price !== 0)

  return (
    <section className="step">
      <div className="row space">
        <h2>Check the items</h2>
        <select
          aria-label="Currency"
          value={bill.currency}
          onChange={(e) => update((b) => ({ ...b, currency: e.target.value }))}
        >
          {[...new Set([bill.currency, ...CURRENCIES])].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <p className="muted">Fix names or prices, remove anything that isn't an item, and add what's missing.</p>

      {bill.items.length === 0 && <p className="empty">No items yet. Add the first one below.</p>}
      <ul className="item-list">
        {bill.items.map((item) => (
          <li key={item.id} className="item-edit">
            <input
              className="grow"
              placeholder="Item name"
              value={item.name}
              onChange={(e) => setItem(item.id, { name: e.target.value })}
              aria-label="Item name"
            />
            <input
              className="qty"
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => setItem(item.id, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              aria-label="Quantity"
              title="Quantity"
            />
            <MoneyInput className="price" value={item.price} allowNegative onChange={(price) => setItem(item.id, { price })} aria-label="Price" />
            <button className="icon-btn" title="Remove item" onClick={() => update((b) => ({ ...b, items: b.items.filter((i) => i.id !== item.id) }))}>
              ✕
            </button>
            {item.quantity > 1 && (
              <button className="link-btn" onClick={() => splitUnits(item)}>
                Split into {item.quantity} separate items
              </button>
            )}
          </li>
        ))}
      </ul>
      <button className="btn ghost" onClick={addItem}>
        + Add item
      </button>

      <h3>Tax, tip & other charges</h3>
      <p className="muted small">These are shared across everyone{' '}
        <select
          value={bill.extrasMode}
          onChange={(e) => update((b) => ({ ...b, extrasMode: e.target.value as typeof b.extrasMode }))}
        >
          <option value="proportional">in proportion to what they ordered</option>
          <option value="equal">equally</option>
        </select>
        .
      </p>
      <ul className="item-list">
        {bill.extras.map((extra) => (
          <li key={extra.id} className="item-edit">
            <input className="grow" value={extra.label} onChange={(e) => setExtra(extra.id, { label: e.target.value })} aria-label="Charge name" />
            {extra.kind === 'discount' ? (
              // Discounts are entered as a positive number and always subtract.
              <span className="minus-wrap">
                −
                <MoneyInput className="price" value={-extra.amount} onChange={(amount) => setExtra(extra.id, { amount: -amount || 0 })} aria-label="Discount amount" />
              </span>
            ) : (
              <MoneyInput className="price" value={extra.amount} allowNegative onChange={(amount) => setExtra(extra.id, { amount })} aria-label="Amount" />
            )}
            <button className="icon-btn" title="Remove" onClick={() => update((b) => ({ ...b, extras: b.extras.filter((e) => e.id !== extra.id) }))}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="row wrap">
        {EXTRA_PRESETS.map((p) => (
          <button key={p.kind} className="chip" onClick={() => addExtra(p.kind, p.label)}>
            + {p.label}
          </button>
        ))}
      </div>
      <div className="row wrap tip-row">
        <span className="muted small">Quick tip:</span>
        {TIP_PERCENTS.map((pct) => (
          <button key={pct} className="chip" onClick={() => setTipPercent(pct)}>
            {pct}%
          </button>
        ))}
      </div>

      <div className="totals">
        <div><span>Items</span><span>{fmt(itemsTotal)}</span></div>
        {bill.extras.length > 0 && <div><span>Charges</span><span>{fmt(extrasTotal)}</span></div>}
        <div className="grand"><span>Total</span><span>{fmt(grandTotal)}</span></div>
        {bill.receiptTotal !== null && (
          <div className={mismatch ? 'warn' : 'ok'}>
            <span>Receipt says</span>
            <span>
              {fmt(bill.receiptTotal)} {mismatch ? '⚠️' : '✓'}
            </span>
          </div>
        )}
      </div>
      {mismatch && (
        <p className="warning">
          The total doesn't match the receipt ({fmt(grandTotal - bill.receiptTotal!)} difference). Some items or prices may have been misread — compare with the photo.
        </p>
      )}

      {ocrText && (
        <details className="ocr">
          <summary>Show text read from the receipt</summary>
          <pre>{ocrText}</pre>
        </details>
      )}

      <Nav onBack={onBack} onNext={onNext} nextDisabled={validItems.length === 0} hint={validItems.length === 0 ? 'Add at least one item with a price.' : undefined} />
    </section>
  )
}
