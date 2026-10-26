# 🧾 Bill Splitter

A mobile-friendly web app that reads a receipt photo and works out who owes what.

1. **Receipt** – take a photo or upload an image. The app reads the items, prices, tax,
   service charge, discounts and printed total. OCR runs entirely in the browser
   (Tesseract.js) — the image never leaves the device. No receipt? Enter items manually.
2. **Items** – fix anything misread, add/remove items, add tax/tip/service charge/discounts
   (with quick tip % buttons). The total is checked against the receipt's total.
   Multi-quantity lines ("3 × Beer") can be split into separate items so different people can claim them.
3. **People** – add everyone sharing the bill.
4. **Assign** – for each item, tap whose order it is. Pick several people to split that item
   equally between them, or "Everyone". A single-amount bill (e.g. utilities) is shared by everyone by default.
5. **Summary** – each person's total with a full breakdown. Copy or share the summary to a group chat.

Tax, tip and other charges are split in proportion to what each person ordered (or equally,
if you prefer). All math is done in whole cents and always adds up exactly to the bill total.
Progress is saved in the browser, so a refresh doesn't lose your work.

## Running it

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests for parsing and splitting
npm run build     # static site in dist/ — host it anywhere (Netlify, GitHub Pages, …)
```

`npm run dev`/`build` copy the OCR engine and English language data into `public/ocr/`
(see `scripts/copy-ocr-assets.mjs`), so the app doesn't depend on a CDN and works offline once loaded.

## Code map

- `src/lib/parser.ts` – turns OCR text into items, charges and totals
- `src/lib/split.ts` – computes each person's share
- `src/lib/money.ts` – amount parsing, formatting and exact cent allocation
- `src/lib/ocr.ts` – image preprocessing + Tesseract
- `src/steps/*` – the five screens
