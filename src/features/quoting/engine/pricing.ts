import type { PriceChannel, PricingRates } from './rates';

/**
 * `estimate`: the layout tool's own model, so calibration applies.
 * `slicer`: exact Bambu Studio figures. `rate`: your per-cell baseplate rate.
 */
export type FigureSource = 'estimate' | 'slicer' | 'rate';

export interface QuoteItemInput {
  /** Client-facing. */
  readonly description: string;
  /** Internal-only extra, e.g. the grid size. */
  readonly detail?: string;
  readonly quantity: number;
  /** Per unit. */
  readonly grams: number;
  /** Per unit, decimal hours. */
  readonly hours: number;
  readonly source: FigureSource;
  /** Paid-model licence, passed through at cost, per unit. */
  readonly licenceFee?: number;
}

export interface QuoteInput {
  readonly items: readonly QuoteItemInput[];
  /** Whole-drawer totals, not per unit. Omit to quote without a baseplate. */
  readonly baseplate?: {
    readonly grams: number;
    readonly hours: number;
    readonly source: FigureSource;
  };
  readonly drawers: number;
  readonly plates: number;
  readonly delivery: boolean;
  /** Defaults to `direct`. */
  readonly channel?: PriceChannel;
}

export interface CostedLine {
  readonly description: string;
  readonly detail: string;
  readonly quantity: number;
  readonly source: FigureSource;
  /** Calibrated, per unit, before scrap buffer. */
  readonly grams: number;
  readonly hours: number;
  readonly materialCost: number;
  readonly machineCost: number;
  readonly productionCost: number;
  readonly licenceFee: number;
  /** Client price per unit. */
  readonly unitPrice: number;
  readonly linePrice: number;
  /** linePrice − quantity × (productionCost + licenceFee). */
  readonly lineProfit: number;
}

export interface Quote {
  readonly items: readonly CostedLine[];
  readonly baseplate: CostedLine | null;
  /** Bins + baseplate. */
  readonly componentsTotal: number;
  /** Setup fee + labour + minimum-order top-up + rounding adjustment. */
  readonly setupLine: number;
  readonly setupBreakdown: {
    readonly setupFees: number;
    readonly labour: number;
    readonly minimumTopUp: number;
    readonly roundingAdjustment: number;
  };
  readonly deliveryLine: number;
  readonly subtotalExFees: number;
  readonly paymentFee: number;
  readonly subtotalExVat: number;
  readonly vat: number;
  readonly total: number;
  readonly internal: {
    readonly productionCost: number;
    readonly licenceFees: number;
    readonly deliveryCost: number;
    readonly paymentFee: number;
    /** Revenue ex VAT minus every cash cost. Includes setup and labour fees. */
    readonly profit: number;
    /** `profit` without setup/labour fees: what the printing alone earns. */
    readonly profitExcludingLabourFees: number;
    readonly marginPercent: number;
    readonly printHours: number;
    readonly weeklyCapacityPercent: number;
    readonly usesCalibratedEstimates: boolean;
  };
}

const cents = (n: number): number => Math.round(n * 100) / 100;

function directPrice(cost: number, rates: PricingRates): number {
  return rates.pricingMode === 'margin' ? cost / (1 - rates.targetMargin) : cost * rates.binMarkup;
}

/** Price for a part costing `cost` to make, in the given channel. */
export function partPrice(cost: number, rates: PricingRates, channel: PriceChannel): number {
  if (channel === 'direct') return directPrice(cost, rates);
  return rates.tradePricing === 'discount'
    ? directPrice(cost, rates) * (1 - rates.tradeDiscount)
    : cost * rates.tradeMarkup;
}

/** Baseplate price: cost-based with a floor, or flat (discounted for trade in discount mode). */
export function baseplatePrice(cost: number, rates: PricingRates, channel: PriceChannel): number {
  if (rates.baseplatePricing === 'flat') {
    return channel === 'trade' && rates.tradePricing === 'discount'
      ? rates.baseplatePrice * (1 - rates.tradeDiscount)
      : rates.baseplatePrice;
  }
  return Math.max(rates.baseplatePrice, partPrice(cost, rates, channel));
}

export function setupFeeFor(rates: PricingRates, channel: PriceChannel): number {
  return channel === 'trade' ? rates.tradeSetupFeePerDrawer : rates.setupFeePerDrawer;
}

function calibrated(value: number, source: FigureSource, factor: number): number {
  return source === 'estimate' ? value * factor : value;
}

/** Unit production cost for a part with the given (already calibrated) figures. */
export function productionCostFor(
  grams: number,
  hours: number,
  rates: PricingRates
): { materialCost: number; machineCost: number; productionCost: number } {
  const buffer = 1 + rates.scrapBuffer;
  const materialCost = (grams / 1000) * rates.filamentCostPerKg * buffer;
  const machineCost =
    hours * rates.machineCostPerHour * (rates.applyScrapBufferToMachine ? buffer : 1);
  return { materialCost, machineCost, productionCost: materialCost + machineCost };
}

function costLine(
  description: string,
  detail: string,
  quantity: number,
  rawGrams: number,
  rawHours: number,
  source: FigureSource,
  licenceFee: number,
  rates: PricingRates,
  priceFor: (productionCost: number) => number
): CostedLine {
  const grams = calibrated(rawGrams, source, rates.calibrationGrams);
  const hours = calibrated(rawHours, source, rates.calibrationHours);
  const { materialCost, machineCost, productionCost } = productionCostFor(grams, hours, rates);
  const unitPrice = cents(priceFor(productionCost) + licenceFee);
  const linePrice = cents(unitPrice * quantity);
  return {
    description,
    detail,
    quantity,
    source,
    grams,
    hours,
    materialCost,
    machineCost,
    productionCost,
    licenceFee,
    unitPrice,
    linePrice,
    lineProfit: linePrice - quantity * (productionCost + licenceFee),
  };
}

export function buildQuote(input: QuoteInput, rates: PricingRates): Quote {
  const channel = input.channel ?? 'direct';
  const items = input.items
    .filter((i) => i.quantity > 0)
    .map((i) =>
      costLine(
        i.description,
        i.detail ?? '',
        i.quantity,
        i.grams,
        i.hours,
        i.source,
        i.licenceFee ?? 0,
        rates,
        (c) => partPrice(c, rates, channel)
      )
    );

  const bp = input.baseplate;
  const baseplate = bp
    ? costLine(
        'Custom-Fitted Drawer Baseplate',
        '',
        1,
        bp.grams,
        bp.hours,
        bp.source,
        0,
        rates,
        (c) => baseplatePrice(c, rates, channel)
      )
    : null;

  const componentsTotal = cents(
    items.reduce((s, l) => s + l.linePrice, 0) + (baseplate?.linePrice ?? 0)
  );
  const setupFees = cents(setupFeeFor(rates, channel) * Math.max(0, input.drawers));
  const labour = cents(rates.labourPerPlate * Math.max(0, input.plates));
  const deliveryLine = input.delivery ? rates.deliveryFee : 0;

  const beforeMinimum = componentsTotal + setupFees + labour;
  const minimumTopUp = cents(Math.max(0, rates.minimumOrder - beforeMinimum));

  const feeFactor = 1 / (1 - rates.paymentFeePercent);
  const vatFactor = rates.vatEnabled ? 1 + rates.vatRate : 1;
  const totalsFor = (setupLine: number) => {
    const subtotalExFees = cents(componentsTotal + setupLine + deliveryLine);
    const subtotalExVat = cents(subtotalExFees * feeFactor);
    const paymentFee = cents(subtotalExVat - subtotalExFees);
    const vat = cents(subtotalExVat * (vatFactor - 1));
    return { subtotalExFees, subtotalExVat, paymentFee, vat, total: cents(subtotalExVat + vat) };
  };

  let setupLine = cents(setupFees + labour + minimumTopUp);
  let totals = totalsFor(setupLine);
  let roundingAdjustment = 0;
  if (rates.roundTotalTo > 0) {
    const target = cents(Math.ceil(totals.total / rates.roundTotalTo - 1e-9) * rates.roundTotalTo);
    // Work back from the rounded total so every figure is whole cents and the
    // client table still sums; the difference lands on the setup line.
    const vat = cents(target - target / vatFactor);
    const subtotalExVat = cents(target - vat);
    const paymentFee = cents(subtotalExVat - subtotalExVat / feeFactor);
    const subtotalExFees = cents(subtotalExVat - paymentFee);
    const newSetup = cents(subtotalExFees - componentsTotal - deliveryLine);
    roundingAdjustment = cents(newSetup - setupLine);
    setupLine = newSetup;
    totals = { subtotalExFees, subtotalExVat, paymentFee, vat, total: target };
  }

  const allLines = baseplate ? [...items, baseplate] : items;
  const productionCost = allLines.reduce((s, l) => s + l.quantity * l.productionCost, 0);
  const licenceFees = allLines.reduce((s, l) => s + l.quantity * l.licenceFee, 0);
  const deliveryCost = input.delivery ? rates.deliveryCost : 0;
  const profit =
    totals.subtotalExVat - totals.paymentFee - productionCost - licenceFees - deliveryCost;
  const printHours = allLines.reduce((s, l) => s + l.quantity * l.hours, 0);

  return {
    items,
    baseplate,
    componentsTotal,
    setupLine,
    setupBreakdown: { setupFees, labour, minimumTopUp, roundingAdjustment },
    deliveryLine,
    ...totals,
    internal: {
      productionCost: cents(productionCost),
      licenceFees: cents(licenceFees),
      deliveryCost,
      paymentFee: totals.paymentFee,
      profit: cents(profit),
      profitExcludingLabourFees: cents(profit - setupFees - labour),
      marginPercent: totals.subtotalExVat > 0 ? (profit / totals.subtotalExVat) * 100 : 0,
      printHours,
      weeklyCapacityPercent: (printHours / rates.weeklyPrintHours) * 100,
      usesCalibratedEstimates: allLines.some((l) => l.source === 'estimate'),
    },
  };
}

/** "2h 30m" / "45m" / "1.5" → decimal hours. */
export function parseDuration(text: string): number | null {
  const t = text.trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  const m = /^(?:(\d+)\s*d)?\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?\s*(?:(\d+)\s*s)?$/.exec(t);
  if (!m || t === '') return null;
  const [d, h, min, s] = (m.slice(1) as (string | undefined)[]).map((v) => v ?? '');
  if (d === '' && h === '' && min === '' && s === '') return null;
  return Number(d) * 24 + Number(h) + Number(min) / 60 + Number(s) / 3600;
}
