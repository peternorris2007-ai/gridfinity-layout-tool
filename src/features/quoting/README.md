# Quoting

Costing and client quotes for a layout, opened from the header's Quote button through `quoteOpen` in the view store and mounted at App level.

## Key files

- `engine/pricing.ts`: `buildQuote`, pure. Material and machine cost with a scrap buffer, markup or true margin, cost-based baseplate with a floor, setup and per-plate labour, minimum order, payment fee, VAT, rounding
- `engine/rates.ts`: every rate with its default and `sanitizeRates`
- `engine/formatQuote.ts`: client quote and internal breakdown as Markdown for copying
- `utils/quoteInput.ts`: layout to quote lines, plates and baseplate figures
- `store/quotingStore.ts`: rates, delivery choice and slicer figures, in localStorage

## Gotchas

- Rates live in the browser, never in source, so a public fork does not publish them.
- Tool estimates are calibrated (`calibrationGrams`, `calibrationHours`); slicer figures and the per-cell baseplate rate are not.
- Plate warm-up is per plate, so it is spread across estimated rows. Slicer figures already include it.
- The client view must not say Gridfinity or the material name: `clientSafe` rewrites labels.
- Strings repeat English in every locale and are allowlisted: the quote wording follows a fixed business template.
