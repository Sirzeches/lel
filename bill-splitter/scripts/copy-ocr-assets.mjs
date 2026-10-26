// Copies the Tesseract OCR worker, WASM core and English language data into public/ocr
// so the app reads receipts without depending on a third-party CDN (and works offline).
import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`))
const out = join(import.meta.dirname, '..', 'public', 'ocr')
mkdirSync(out, { recursive: true })

const files = [
  [join(pkgDir('tesseract.js'), 'dist', 'worker.min.js'), 'worker.min.js'],
  ...['tesseract-core-lstm', 'tesseract-core-simd-lstm', 'tesseract-core-relaxedsimd-lstm'].map((f) => [
    join(pkgDir('tesseract.js-core'), `${f}.wasm.js`),
    `${f}.wasm.js`,
  ]),
  // Stored under a .wasm name because some static hosts refuse to serve .gz files.
  // The bytes are still gzip; Tesseract detects that and decompresses them.
  [join(pkgDir('@tesseract.js-data/eng'), '4.0.0_best_int', 'eng.traineddata.gz'), 'eng-traineddata.wasm'],
]
for (const [from, to] of files) copyFileSync(from, join(out, to))
console.log(`Copied ${files.length} OCR assets to public/ocr`)
