import type { Quote } from './pricing';
import type { PriceChannel, PricingRates } from './rates';

export interface QuoteMeta {
  readonly layoutName: string;
  /** YYYY-MM-DD */
  readonly date: string;
  /** Defaults to `direct`. */
  readonly channel?: PriceChannel;
}

export const QUOTE_HEADINGS: Record<PriceChannel, string> = {
  direct: 'Quote: Custom Modular Drawer Storage Solution',
  trade: 'Trade Quote: Custom Modular Drawer Storage Solution',
};

/** Client-facing wording rules: no trade or material names. */
export function clientSafe(text: string): string {
  return text
    .replace(/gridfinity/gi, 'modular storage')
    .replace(/\bpetg\b/gi, 'high-durability material')
    .replace(/\bpla\b/gi, 'high-durability material');
}

export function formatMoney(amount: number, symbol: string): string {
  const fixed = Math.abs(amount).toFixed(2);
  const [whole = '0', dec = '00'] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${amount < 0 ? '−' : ''}${symbol}${grouped}.${dec}`;
}

const cell = (s: string): string => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function clientQuoteMarkdown(q: Quote, rates: PricingRates, meta: QuoteMeta): string {
  const m = (n: number) => formatMoney(n, rates.currencySymbol);
  const rows: string[] = q.items.map((l) => {
    const name = clientSafe(l.description);
    const label = l.quantity > 1 ? `${name} (×${l.quantity})` : name;
    return `| ${cell(label)} | ${m(l.linePrice)} |`;
  });
  if (q.baseplate)
    rows.push(`| **Custom-Fitted Drawer Baseplate** | ${m(q.baseplate.linePrice)} |`);
  rows.push(`| **Drawer Measurement, CAD Layout & Setup** | ${m(q.setupLine)} |`);

  const summary = [
    `* **Custom Storage Components:** ${m(q.componentsTotal)}`,
    `* **Design, Layout & Setup Fee:** ${m(q.setupLine)}`,
    `* **Packaging & Courier Delivery:** ${q.deliveryLine > 0 ? m(q.deliveryLine) : `${m(0)} (collection)`}`,
  ];
  if (q.paymentFee > 0) summary.push(`* **Card Payment Fee:** ${m(q.paymentFee)}`);
  if (rates.vatEnabled) {
    summary.push(`* **Subtotal (excl. VAT):** ${m(q.subtotalExVat)}`);
    summary.push(`* **VAT (${Math.round(rates.vatRate * 100)}%):** ${m(q.vat)}`);
  }
  summary.push(`* **Total Quote:** **${m(q.total)}**`);

  return [
    `# ${QUOTE_HEADINGS[meta.channel ?? 'direct']}`,
    '',
    `**Project / Layout:** ${clientSafe(meta.layoutName)}`,
    `**Date:** ${meta.date}`,
    '',
    '| Item Description | Price |',
    '| :--- | :--- |',
    ...rows,
    '',
    '### Summary',
    ...summary,
    '',
    '*Note: All components are custom-manufactured to your exact drawer dimensions using high-durability material engineered for daily kitchen and home organization.*',
    '',
  ].join('\n');
}

export function internalBreakdownMarkdown(q: Quote, rates: PricingRates, meta: QuoteMeta): string {
  const m = (n: number) => formatMoney(n, rates.currencySymbol);
  const lines = q.baseplate ? [...q.items, q.baseplate] : q.items;
  const rows = lines.map(
    (l) =>
      `| ${cell(l.detail ? `${l.description} [${l.detail}]` : l.description)} | ${l.quantity} | ${(l.grams * l.quantity).toFixed(0)} g | ${(l.hours * l.quantity).toFixed(2)} h | ${m(l.materialCost * l.quantity)} | ${m(l.machineCost * l.quantity)} | ${m(l.productionCost * l.quantity)} | ${m(l.linePrice)} | ${m(l.lineProfit)} |`
  );
  const i = q.internal;
  const b = q.setupBreakdown;
  const out = [
    `# Internal Breakdown (${meta.channel === 'trade' ? 'trade' : 'direct'}): ${meta.layoutName}`,
    '',
    `**Date:** ${meta.date}`,
    i.usesCalibratedEstimates
      ? `**Figures:** calibrated estimates (grams ×${rates.calibrationGrams}, time ×${rates.calibrationHours}). Slice in Bambu Studio for exact numbers.`
      : '**Figures:** slicer data (exact).',
    q.baseplate?.source === 'rate'
      ? `**Baseplate:** per-cell rate (${rates.baseplateGramsPerCell} g, ${rates.baseplateHoursPerCell} h per cell). Enter slicer figures for an exact cost.`
      : '',
    '',
    '| Item | Qty | Filament | Print time | Material | Machine | Production | Retail | Profit |',
    '| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows,
    '',
    '### Revenue',
    `* Components: ${m(q.componentsTotal)}`,
    `* Setup fees: ${m(b.setupFees)}`,
  ];
  if (b.labour > 0) out.push(`* Labour (per plate): ${m(b.labour)}`);
  if (b.minimumTopUp > 0) out.push(`* Minimum-order top-up: ${m(b.minimumTopUp)}`);
  if (b.roundingAdjustment !== 0) out.push(`* Rounding: ${m(b.roundingAdjustment)}`);
  out.push(`* Delivery charged: ${m(q.deliveryLine)}`);
  if (q.paymentFee > 0) out.push(`* Payment fee charged: ${m(q.paymentFee)}`);
  out.push(`* **Revenue (excl. VAT):** ${m(q.subtotalExVat)}`);
  if (rates.vatEnabled) out.push(`* VAT collected (pay over to SARS): ${m(q.vat)}`);
  out.push('', '### Costs', `* Production (material + machine): ${m(i.productionCost)}`);
  if (i.licenceFees > 0) out.push(`* Model licences: ${m(i.licenceFees)}`);
  out.push(`* Courier and packaging: ${m(i.deliveryCost)}`);
  if (i.paymentFee > 0) out.push(`* Payment processor: ${m(i.paymentFee)}`);
  out.push(
    '',
    '### Viability',
    `* **Profit:** ${m(i.profit)} (${i.marginPercent.toFixed(1)}% of revenue)`,
    `* Profit from printing alone (without setup and labour fees): ${m(i.profitExcludingLabourFees)}`,
    `* Total print time: ${i.printHours.toFixed(2)} h, ${i.weeklyCapacityPercent.toFixed(0)}% of a ${rates.weeklyPrintHours}-hour print week`,
    ''
  );
  if (rates.deliveryCost === 0 && q.deliveryLine > 0) {
    out.push(
      '*Courier cost is set to R0, so delivery counts as pure profit. Set it in rates.*',
      ''
    );
  }
  return out.join('\n');
}
