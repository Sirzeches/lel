import { useEffect, useState } from 'react'
import { centsToInput, parseAmount } from './lib/money'
import type { Bill, Cents } from './lib/types'

export type BillUpdater = (fn: (bill: Bill) => Bill) => void

export interface StepProps {
  bill: Bill
  update: BillUpdater
  onNext: () => void
  onBack: () => void
}

/** Text input for an amount that lets the user type freely and commits parsed cents. */
export function MoneyInput({
  value,
  onChange,
  allowNegative = false,
  ...rest
}: {
  value: Cents
  onChange: (cents: Cents) => void
  allowNegative?: boolean
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [text, setText] = useState(centsToInput(value))
  useEffect(() => {
    // Keep in sync when the value is changed from elsewhere (e.g. a tip preset).
    if (parseAmount(text) !== value) setText(centsToInput(value))
  }, [value])
  return (
    <input
      {...rest}
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        let cents = parseAmount(e.target.value) ?? 0
        if (!allowNegative) cents = Math.abs(cents)
        onChange(cents)
      }}
      onBlur={() => setText(centsToInput(value))}
      onFocus={(e) => e.target.select()}
    />
  )
}

export function Nav({
  onBack,
  onNext,
  nextLabel = 'Next',
  nextDisabled,
  hint,
}: {
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  hint?: string
}) {
  return (
    <div className="nav">
      {hint && <p className="nav-hint">{hint}</p>}
      <div className="nav-buttons">
        {onBack ? (
          <button className="btn ghost" onClick={onBack}>
            ← Back
          </button>
        ) : (
          <span />
        )}
        {onNext && (
          <button className="btn primary" onClick={onNext} disabled={nextDisabled}>
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  )
}
