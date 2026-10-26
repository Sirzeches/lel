/**
 * In-browser receipt OCR using Tesseract.js. Nothing is uploaded anywhere: the image stays
 * on the device, and the OCR engine + English data are served from this app's own /ocr folder
 * (copied there by scripts/copy-ocr-assets.mjs).
 */

const LOAD_TIMEOUT_MS = 60_000

/** Scale up and convert to high-contrast grayscale, which noticeably helps Tesseract on photos. */
async function preprocess(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  const longest = Math.max(bitmap.width, bitmap.height)
  // Aim for ~2000px on the long side: small photos get upscaled, huge ones downscaled.
  const scale = Math.min(3, 2000 / longest)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    // Simple contrast stretch around mid-gray.
    const v = Math.max(0, Math.min(255, (gray - 128) * 1.5 + 128))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

export async function recognizeReceipt(file: Blob, onProgress?: (fraction: number, status: string) => void): Promise<string> {
  const { createWorker, PSM } = await import('tesseract.js')
  const base = new URL('ocr/', document.baseURI).href
  // If the worker script fails to load, Tesseract never settles, so give up after a while.
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timed out loading the OCR engine')), LOAD_TIMEOUT_MS)
  })
  const worker = await Promise.race([
    createWorker('eng', undefined, {
      workerPath: `${base}worker.min.js`,
      corePath: base,
      // Tesseract appends "/eng.traineddata.gz"; the "?" turns that into an ignored query string.
      langPath: `${base}eng-traineddata.wasm?`,
      logger: (m: { status: string; progress: number }) => onProgress?.(m.progress, m.status),
      errorHandler: (e: unknown) => console.error(e),
    }),
    timeout,
  ]).finally(() => clearTimeout(timer))
  try {
    // Treat the image as one uniform block of text, which keeps receipt rows on one line.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: '1' })
    const canvas = await preprocess(file)
    const { data } = await worker.recognize(canvas)
    return data.text
  } finally {
    await worker.terminate()
  }
}
