import { useState } from 'react'
import type { BillUpdater } from './components'
import { STEPS, emptyBill, uid, usePersistentState, type Step } from './lib/state'
import { SAMPLE_RECEIPT } from './lib/sample'
import { parseReceiptText } from './lib/parser'
import { AssignStep } from './steps/AssignStep'
import { PeopleStep } from './steps/PeopleStep'
import { ReviewStep } from './steps/ReviewStep'
import { SummaryStep } from './steps/SummaryStep'
import { UploadStep } from './steps/UploadStep'

export function App() {
  const [state, setState] = usePersistentState()
  const { step, bill, ocrText } = state

  const update: BillUpdater = (fn) => setState((s) => ({ ...s, bill: fn(s.bill) }))
  const go = (to: Step) => {
    setState((s) => {
      let next = s.bill
      // A single-amount bill (e.g. utilities) is shared by everyone unless changed.
      if (to === 3 && next.items.length === 1 && next.items[0].assignees.length === 0) {
        next = { ...next, items: [{ ...next.items[0], assignees: next.people.map((p) => p.id) }] }
      }
      // Drop blank rows the user added but never filled in.
      if (to === 2) next = { ...next, items: next.items.filter((i) => i.price !== 0 || i.name.trim()) }
      return { ...s, bill: next, step: to }
    })
    window.scrollTo({ top: 0 })
  }
  // Two-tap confirmation: the first tap arms it, a second tap within a few seconds clears the bill.
  const [confirming, setConfirming] = useState(false)
  const restart = () => {
    if (bill.items.length && !confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 4000)
      return
    }
    setConfirming(false)
    setState({ step: 0, bill: emptyBill(bill.currency), ocrText: '' })
  }
  const loadSample = () => {
    const parsed = parseReceiptText(SAMPLE_RECEIPT)
    setState((s) => ({
      ...s,
      step: 1,
      ocrText: SAMPLE_RECEIPT,
      bill: {
        ...s.bill,
        items: parsed.items.map((i) => ({ ...i, id: uid(), assignees: [] })),
        extras: parsed.extras.map((e) => ({ ...e, id: uid() })),
        receiptTotal: parsed.total,
      },
    }))
  }
  const next = () => go(Math.min(step + 1, 4) as Step)
  const back = () => go(Math.max(step - 1, 0) as Step)

  return (
    <div className="app">
      <header>
        <div className="row space">
          <h1>🧾 Bill Splitter</h1>
          {(bill.items.length > 0 || bill.people.length > 0) && (
            <button className={`link-btn ${confirming ? 'danger' : ''}`} onClick={restart}>
              {confirming ? 'Tap again to clear this bill' : 'Start over'}
            </button>
          )}
        </div>
        <ol className="stepper">
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? 'current' : i < step ? 'done' : ''}>
              <button onClick={() => i < step && go(i as Step)} disabled={i >= step}>
                <span className="dot">{i < step ? '✓' : i + 1}</span>
                <span className="label">{label}</span>
              </button>
            </li>
          ))}
        </ol>
      </header>

      <main>
        {step === 0 && (
          <UploadStep
            hasExistingBill={bill.items.length > 0}
            onScanned={(patch, text) => {
              setState((s) => ({ ...s, bill: { ...s.bill, ...patch }, ocrText: text, step: 1 }))
            }}
            onManual={next}
            onSample={loadSample}
          />
        )}
        {step === 1 && <ReviewStep bill={bill} update={update} onNext={next} onBack={back} ocrText={ocrText} />}
        {step === 2 && <PeopleStep bill={bill} update={update} onNext={next} onBack={back} />}
        {step === 3 && <AssignStep bill={bill} update={update} onNext={next} onBack={back} />}
        {step === 4 && <SummaryStep bill={bill} onBack={back} onRestart={restart} confirming={confirming} />}
      </main>
    </div>
  )
}
