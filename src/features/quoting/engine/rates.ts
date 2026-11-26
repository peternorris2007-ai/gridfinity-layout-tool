export type PricingMode = 'markup' | 'margin';
export type BaseplatePricing = 'costWithMinimum' | 'flat';
/** `direct`: selling to the home owner. `trade`: selling to a kitchen company. */
export type PriceChannel = 'direct' | 'trade';
export type TradePricing = 'markup' | 'discount';

/** Every number a quote depends on. Stored per browser, never in source. */
export interface PricingRates {
  readonly currencySymbol: string;

  readonly filamentCostPerKg: number;
  /** Failed prints and purge waste, as a fraction (0.05 = 5%). */
  readonly scrapBuffer: number;
  readonly applyScrapBufferToMachine: boolean;
  readonly machineCostPerHour: number;

  readonly pricingMode: PricingMode;
  /** Used when `pricingMode` is `markup`: price = cost × markup. */
  readonly binMarkup: number;
  /** Used when `pricingMode` is `margin`: price = cost ÷ (1 − margin). */
  readonly targetMargin: number;

  readonly baseplatePricing: BaseplatePricing;
  /** Floor in `costWithMinimum` mode, the whole price in `flat` mode. */
  readonly baseplatePrice: number;
  /** Rough figures per grid cell, used until baseplate slicer numbers are entered. */
  readonly baseplateGramsPerCell: number;
  readonly baseplateHoursPerCell: number;

  readonly setupFeePerDrawer: number;

  /** `markup`: trade price = cost × tradeMarkup. `discount`: direct price less tradeDiscount. */
  readonly tradePricing: TradePricing;
  readonly tradeMarkup: number;
  readonly tradeDiscount: number;
  readonly tradeSetupFeePerDrawer: number;
  readonly labourPerPlate: number;

  readonly deliveryFee: number;
  /** What delivery actually costs you (courier + box); internal view only. */
  readonly deliveryCost: number;

  /** Card/payment processor fee as a fraction of the amount collected. */
  readonly paymentFeePercent: number;
  readonly vatEnabled: boolean;
  readonly vatRate: number;

  /** Ex-VAT subtotal floor; any shortfall is added to the setup line. */
  readonly minimumOrder: number;
  /** Round the final total up to a multiple of this (0 = no rounding). */
  readonly roundTotalTo: number;

  /** Applied to the layout tool's own estimates, not to slicer figures. */
  readonly calibrationGrams: number;
  readonly calibrationHours: number;

  readonly weeklyPrintHours: number;
}

/**
 * Defaults from the business pricing spec, with the review changes:
 * separate time/grams calibration and a cost-based baseplate with a floor.
 */
export const DEFAULT_PRICING_RATES: PricingRates = {
  currencySymbol: 'R',
  filamentCostPerKg: 350,
  scrapBuffer: 0.05,
  applyScrapBufferToMachine: true,
  machineCostPerHour: 8.3,
  pricingMode: 'markup',
  binMarkup: 2.6,
  targetMargin: 0.355,
  baseplatePricing: 'costWithMinimum',
  baseplatePrice: 150,
  baseplateGramsPerCell: 1.19,
  baseplateHoursPerCell: 0.18,
  setupFeePerDrawer: 350,
  tradePricing: 'markup',
  tradeMarkup: 2,
  tradeDiscount: 0.25,
  tradeSetupFeePerDrawer: 350,
  labourPerPlate: 0,
  deliveryFee: 150,
  deliveryCost: 0,
  paymentFeePercent: 0,
  vatEnabled: false,
  vatRate: 0.15,
  minimumOrder: 0,
  roundTotalTo: 0,
  calibrationGrams: 0.65,
  calibrationHours: 0.57,
  weeklyPrintHours: 40,
};

/**
 * Coerce a partially-stored or hand-edited rates object back to a complete,
 * sane one. Anything missing or out of range falls back to the default.
 */
export function sanitizeRates(input: unknown): PricingRates {
  const src = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const d = DEFAULT_PRICING_RATES;

  const num = (key: keyof PricingRates, min: number, max: number): number => {
    const v = src[key];
    return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
      ? v
      : (d[key] as number);
  };
  const bool = (key: keyof PricingRates): boolean => {
    const v = src[key];
    return typeof v === 'boolean' ? v : (d[key] as boolean);
  };

  const symbol = src.currencySymbol;
  return {
    currencySymbol: typeof symbol === 'string' && symbol.length <= 4 ? symbol : d.currencySymbol,
    filamentCostPerKg: num('filamentCostPerKg', 0, 100_000),
    scrapBuffer: num('scrapBuffer', 0, 1),
    applyScrapBufferToMachine: bool('applyScrapBufferToMachine'),
    machineCostPerHour: num('machineCostPerHour', 0, 10_000),
    pricingMode:
      src.pricingMode === 'margin'
        ? 'margin'
        : src.pricingMode === 'markup'
          ? 'markup'
          : d.pricingMode,
    binMarkup: num('binMarkup', 1, 100),
    targetMargin: num('targetMargin', 0, 0.95),
    baseplatePricing:
      src.baseplatePricing === 'flat'
        ? 'flat'
        : src.baseplatePricing === 'costWithMinimum'
          ? 'costWithMinimum'
          : d.baseplatePricing,
    baseplatePrice: num('baseplatePrice', 0, 1_000_000),
    baseplateGramsPerCell: num('baseplateGramsPerCell', 0, 1000),
    baseplateHoursPerCell: num('baseplateHoursPerCell', 0, 100),
    setupFeePerDrawer: num('setupFeePerDrawer', 0, 1_000_000),
    tradePricing:
      src.tradePricing === 'discount'
        ? 'discount'
        : src.tradePricing === 'markup'
          ? 'markup'
          : d.tradePricing,
    tradeMarkup: num('tradeMarkup', 1, 100),
    tradeDiscount: num('tradeDiscount', 0, 0.95),
    tradeSetupFeePerDrawer: num('tradeSetupFeePerDrawer', 0, 1_000_000),
    labourPerPlate: num('labourPerPlate', 0, 1_000_000),
    deliveryFee: num('deliveryFee', 0, 1_000_000),
    deliveryCost: num('deliveryCost', 0, 1_000_000),
    paymentFeePercent: num('paymentFeePercent', 0, 0.5),
    vatEnabled: bool('vatEnabled'),
    vatRate: num('vatRate', 0, 1),
    minimumOrder: num('minimumOrder', 0, 10_000_000),
    roundTotalTo: num('roundTotalTo', 0, 100_000),
    calibrationGrams: num('calibrationGrams', 0.05, 5),
    calibrationHours: num('calibrationHours', 0.05, 5),
    weeklyPrintHours: num('weeklyPrintHours', 1, 168),
  };
}
