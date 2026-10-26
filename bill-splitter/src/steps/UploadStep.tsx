import { useEffect, useRef, useState } from 'react'
import { recognizeReceipt } from '../lib/ocr'
import { parseReceiptText } from '../lib/parser'
import { uid } from '../lib/state'
import type { Bill } from '../lib/types'

const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'Loading reader…',
  'initializing tesseract': 'Starting reader…',
  'loading language traineddata': 'Loading language data…',
  'initializing api': 'Starting reader…',
  'recognizing text': 'Reading receipt…',
}

export function UploadStep({
  hasExistingBill,
  onScanned,
  onManual,
  onSample,
}: {
  hasExistingBill: boolean
  onScanned: (patch: Partial<Bill>, ocrText: string) => void
  onManual: () => void
  onSample: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ fraction: number; status: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function pick(f: File | undefined) {
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setError('Please choose an image (JPG, PNG, HEIC…) of the receipt.')
      return
    }
    setError(null)
    setFile(f)
  }

  async function scan() {
    if (!file) return
    setError(null)
    setProgress({ fraction: 0, status: 'Starting…' })
    try {
      const text = await recognizeReceipt(file, (fraction, status) =>
        setProgress({ fraction, status: STATUS_LABELS[status] ?? 'Working…' }),
      )
      const parsed = parseReceiptText(text)
      onScanned(
        {
          items: parsed.items.map((i) => ({ ...i, id: uid(), assignees: [] })),
          extras: parsed.extras.map((e) => ({ ...e, id: uid() })),
          receiptTotal: parsed.total,
        },
        text,
      )
    } catch (e) {
      console.error(e)
      setError("Couldn't read that image. Check your connection (the reader downloads once), or enter the items manually.")
    } finally {
      setProgress(null)
    }
  }

  const busy = progress !== null

  return (
    <section className="step">
      <h2>Upload a receipt</h2>
      <p className="muted">Snap a photo or choose one from your gallery. We'll read the items and prices for you — you can fix anything we get wrong next.</p>

      <div
        className={`dropzone ${preview ? 'has-image' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          pick(e.dataTransfer.files[0])
        }}
      >
        {preview ? (
          <img src={preview} alt="Receipt preview" />
        ) : (
          <div className="dropzone-empty">
            <div className="big-icon">🧾</div>
            <p>Drop a receipt image here</p>
          </div>
        )}
      </div>

      <div className="row wrap">
        <button className="btn" onClick={() => cameraRef.current?.click()} disabled={busy}>
          📷 Take photo
        </button>
        <button className="btn" onClick={() => galleryRef.current?.click()} disabled={busy}>
          🖼️ Choose image
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />

      {busy && (
        <div className="progress" role="status">
          <div className="progress-bar">
            <div style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
          </div>
          <span>{progress.status}</span>
        </div>
      )}
      {error && <p className="error">{error}</p>}

      <div className="stack">
        <button className="btn primary block" onClick={scan} disabled={!file || busy}>
          {busy ? 'Reading…' : 'Read receipt'}
        </button>
        <button className="btn ghost block" onClick={onManual} disabled={busy}>
          {hasExistingBill ? 'Continue with current items →' : 'No receipt? Enter items manually →'}
        </button>
        {!hasExistingBill && (
          <button className="link-btn center" onClick={onSample} disabled={busy}>
            Just looking? Try a sample receipt
          </button>
        )}
      </div>
    </section>
  )
}
