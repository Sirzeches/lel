import { useEffect, useState } from 'react'
import type { Bill } from './types'

export const STEPS = ['Receipt', 'Items', 'People', 'Assign', 'Summary'] as const
export type Step = 0 | 1 | 2 | 3 | 4

export interface AppState {
  step: Step
  bill: Bill
  /** Raw OCR output, kept so the user can refer to it while fixing items. */
  ocrText: string
}

export function emptyBill(currency = defaultCurrency()): Bill {
  return { currency, items: [], extras: [], extrasMode: 'proportional', receiptTotal: null, people: [] }
}

function defaultCurrency(): string {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region
    const byRegion: Record<string, string> = {
      US: 'USD', GB: 'GBP', PH: 'PHP', AU: 'AUD', CA: 'CAD', SG: 'SGD', JP: 'JPY', IN: 'INR', MY: 'MYR', NZ: 'NZD', HK: 'HKD',
      DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', IE: 'EUR', PT: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR',
    }
    return (region && byRegion[region]) || 'USD'
  } catch {
    return 'USD'
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

const KEY = 'bill-splitter:v1'

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed?.bill?.items) return parsed
    }
  } catch {
    // Storage unavailable or corrupt: start fresh.
  }
  return { step: 0, bill: emptyBill(), ocrText: '' }
}

/** App state that survives page reloads, so a half-split bill isn't lost. */
export function usePersistentState() {
  const [state, setState] = useState<AppState>(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // Ignore quota / private-mode errors.
    }
  }, [state])
  return [state, setState] as const
}
