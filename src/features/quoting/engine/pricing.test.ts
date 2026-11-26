import { describe, it, expect } from 'vitest';
import { buildQuote, parseDuration, productionCostFor } from './pricing';
import { DEFAULT_PRICING_RATES, sanitizeRates, type PricingRates } from './rates';
import type { QuoteInput } from './pricing';

// Arithmetic tests pin the spec's original R200 setup fee.
const rates = (over: Partial<PricingRates> = {}): PricingRates => ({
  ...DEFAULT_PRICING_RATES,
  setupFeePerDrawer: 200,
  ...over,
});

const oneBin = (over: Partial<QuoteInput> = {}): QuoteInput => ({
  items: [{ description: '2×2 bin', quantity: 1, grams: 100, hours: 2, source: 'slicer' }],
  drawers: 1,
  plates: 1,
  delivery: true,
  ...over,
});

describe('productionCostFor', () => {
  it('matches the spec: R0.35/g and R8.30/hr, 5% buffer on both', () => {
    const c = productionCostFor(100, 2, rates());
    expect(c.materialCost).toBeCloseTo(36.75, 6);
    expect(c.machineCost).toBeCloseTo(17.43, 6);
    expect(c.productionCost).toBeCloseTo(54.18, 6);
  });

  it('can leave machine time unbuffered, as the original spec did', () => {
    const c = productionCostFor(100, 2, rates({ applyScrapBufferToMachine: false }));
    expect(c.machineCost).toBeCloseTo(16.6, 6);
  });
});

describe('buildQuote', () => {
  it('prices bins at production cost × 1.55', () => {
    const q = buildQuote(oneBin(), rates());
    expect(q.items[0]?.unitPrice).toBe(83.98);
  });

  it('calibrates tool estimates with separate grams/time factors, slicer figures untouched', () => {
    const est = buildQuote(
      oneBin({
        items: [{ description: 'b', quantity: 1, grams: 100, hours: 2, source: 'estimate' }],
      }),
      rates()
    );
    expect(est.items[0]?.grams).toBeCloseTo(65, 6);
    expect(est.items[0]?.hours).toBeCloseTo(1.14, 6);
    expect(est.internal.usesCalibratedEstimates).toBe(true);
    expect(buildQuote(oneBin(), rates()).internal.usesCalibratedEstimates).toBe(false);
  });

  it('uses true margin when asked: price = cost ÷ (1 − margin)', () => {
    const q = buildQuote(oneBin(), rates({ pricingMode: 'margin', targetMargin: 0.3 }));
    expect(q.items[0]?.unitPrice).toBeCloseTo(54.18 / 0.7, 2);
  });

  it('floors a small baseplate at R150 and prices a large one on cost', () => {
    const small = buildQuote(
      oneBin({ baseplate: { grams: 120, hours: 3, source: 'slicer' } }),
      rates()
    );
    expect(small.baseplate?.linePrice).toBe(150);
    const large = buildQuote(
      oneBin({ baseplate: { grams: 400, hours: 9, source: 'slicer' } }),
      rates()
    );
    // (400 × 0.35 + 9 × 8.30) × 1.05 × 1.55 = 349.42
    expect(large.baseplate?.linePrice).toBe(349.42);
  });

  it('charges a flat baseplate when set to flat', () => {
    const q = buildQuote(
      oneBin({ baseplate: { grams: 400, hours: 9, source: 'slicer' } }),
      rates({ baseplatePricing: 'flat' })
    );
    expect(q.baseplate?.linePrice).toBe(150);
  });

  it('adds setup per drawer, labour per plate, and delivery', () => {
    const q = buildQuote(oneBin({ drawers: 2, plates: 3 }), rates({ labourPerPlate: 20 }));
    expect(q.setupLine).toBe(460);
    expect(q.deliveryLine).toBe(150);
    expect(q.total).toBe(83.98 + 460 + 150);
  });

  it('drops delivery fee and cost for collection', () => {
    const q = buildQuote(oneBin({ delivery: false }), rates({ deliveryCost: 90 }));
    expect(q.deliveryLine).toBe(0);
    expect(q.internal.deliveryCost).toBe(0);
  });

  it('tops up to the minimum order on the setup line', () => {
    const q = buildQuote(oneBin({ delivery: false }), rates({ minimumOrder: 400 }));
    expect(q.setupBreakdown.minimumTopUp).toBeCloseTo(400 - 283.98, 2);
    expect(q.subtotalExFees).toBe(400);
  });

  it('grosses up for payment fees and adds VAT on top', () => {
    const q = buildQuote(
      oneBin({ delivery: false }),
      rates({ paymentFeePercent: 0.03, vatEnabled: true })
    );
    expect(q.subtotalExVat).toBeCloseTo(283.98 / 0.97, 2);
    expect(q.vat).toBeCloseTo(q.subtotalExVat * 0.15, 2);
    expect(q.total).toBeCloseTo(q.subtotalExVat + q.vat, 2);
  });

  it('rounds the total up to a clean figure and the lines still add up', () => {
    const q = buildQuote(
      oneBin(),
      rates({ roundTotalTo: 5, vatEnabled: true, paymentFeePercent: 0.03 })
    );
    expect(q.total % 5).toBeCloseTo(0, 6);
    const exFees = q.componentsTotal + q.setupLine + q.deliveryLine;
    expect(q.subtotalExFees).toBeCloseTo(exFees, 2);
    expect(q.total).toBeCloseTo(q.subtotalExVat + q.vat, 2);
  });

  it('reports profit after costs, and separately without the labour fees', () => {
    const q = buildQuote(oneBin(), rates({ deliveryCost: 100 }));
    // revenue 433.98 − production 54.18 − courier 100
    expect(q.internal.profit).toBe(279.8);
    expect(q.internal.profitExcludingLabourFees).toBe(79.8);
  });

  it('passes licence fees through at cost', () => {
    const q = buildQuote(
      oneBin({
        items: [
          { description: 'b', quantity: 2, grams: 100, hours: 2, source: 'slicer', licenceFee: 25 },
        ],
      }),
      rates()
    );
    expect(q.items[0]?.unitPrice).toBe(108.98);
    expect(q.internal.licenceFees).toBe(50);
  });

  it('reports print hours against a 40-hour week', () => {
    const q = buildQuote(
      oneBin({
        items: [{ description: 'b', quantity: 4, grams: 100, hours: 2.5, source: 'slicer' }],
      }),
      rates()
    );
    expect(q.internal.printHours).toBe(10);
    expect(q.internal.weeklyCapacityPercent).toBe(25);
  });
});

describe('parseDuration', () => {
  it.each([
    ['2h 30m', 2.5],
    ['45m', 0.75],
    ['1d 2h', 26],
    ['1.5', 1.5],
    ['3h', 3],
  ])('%s → %d', (text, hours) => {
    expect(parseDuration(text)).toBeCloseTo(hours, 6);
  });

  it('rejects junk', () => {
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('soon')).toBeNull();
  });
});

describe('sanitizeRates', () => {
  it('falls back to defaults for missing or out-of-range values', () => {
    const r = sanitizeRates({ binMarkup: -1, filamentCostPerKg: 400, pricingMode: 'nope' });
    expect(r.binMarkup).toBe(1.55);
    expect(r.filamentCostPerKg).toBe(400);
    expect(r.pricingMode).toBe('markup');
    expect(sanitizeRates(null)).toEqual(DEFAULT_PRICING_RATES);
  });
});
