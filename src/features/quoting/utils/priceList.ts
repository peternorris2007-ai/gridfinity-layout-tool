import { estimateStandardBinFilament, type PrintSettings } from '@/shared/printSettings';
import { baseplatePrice, partPrice, productionCostFor, setupFeeFor } from '../engine/pricing';
import type { PricingRates } from '../engine/rates';

export interface PriceListGrid {
  readonly gridUnitMm: number;
  readonly gridUnitMmY: number;
  readonly heightUnitMm: number;
}

export interface PriceListCell {
  readonly heightUnits: number;
  readonly cost: number;
  readonly trade: number;
  readonly direct: number;
}

export interface PriceListRow {
  readonly widthUnits: number;
  readonly depthUnits: number;
  readonly widthMm: number;
  readonly depthMm: number;
  readonly cells: readonly PriceListCell[];
}

export interface PriceList {
  readonly heightsMm: readonly number[];
  readonly rows: readonly PriceListRow[];
  readonly baseplatePerCell: {
    readonly cost: number;
    readonly trade: number;
    readonly direct: number;
  };
  readonly baseplateMinimum: number;
  readonly cellSizeMm: string;
  readonly setup: { readonly trade: number; readonly direct: number };
  readonly delivery: number;
}

/** Common kitchen footprints in grid units, width × depth. */
export const PRICE_LIST_FOOTPRINTS: readonly (readonly [number, number])[] = [
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [1, 6],
  [2, 2],
  [2, 3],
  [2, 4],
  [2, 6],
  [2, 7],
  [3, 3],
  [3, 4],
  [3, 6],
  [4, 4],
  [4, 6],
  [6, 6],
];

/** Low, medium and deep bins, in height units. */
export const PRICE_LIST_HEIGHTS: readonly number[] = [3, 6, 8];

/** List prices round up to a clean figure. */
export const roundListPrice = (n: number): number => Math.ceil(n / 5 - 1e-9) * 5;

/**
 * Per-bin list prices. Each bin carries its own plate warm-up, so list prices
 * are slightly conservative next to a full-layout quote that shares plates.
 */
export function buildPriceList(
  grid: PriceListGrid,
  printSettings: PrintSettings,
  rates: PricingRates
): PriceList {
  const priced = (cost: number) => ({
    cost,
    trade: roundListPrice(partPrice(cost, rates, 'trade')),
    direct: roundListPrice(partPrice(cost, rates, 'direct')),
  });

  const rows = PRICE_LIST_FOOTPRINTS.map(([w, d]) => ({
    widthUnits: w,
    depthUnits: d,
    widthMm: Math.round(w * grid.gridUnitMm),
    depthMm: Math.round(d * grid.gridUnitMmY),
    cells: PRICE_LIST_HEIGHTS.map((h) => {
      const est = estimateStandardBinFilament(
        w,
        d,
        h,
        printSettings,
        grid.gridUnitMm,
        grid.heightUnitMm,
        grid.gridUnitMmY
      );
      const { productionCost } = productionCostFor(
        est.gramsFilament * rates.calibrationGrams,
        (est.printTimeMinutes / 60) * rates.calibrationHours,
        rates
      );
      return { heightUnits: h, ...priced(productionCost) };
    }),
  }));

  const cellCost = productionCostFor(
    rates.baseplateGramsPerCell,
    rates.baseplateHoursPerCell,
    rates
  ).productionCost;
  const cellPrice = (channel: 'trade' | 'direct') =>
    rates.baseplatePricing === 'flat'
      ? 0
      : Math.ceil(partPrice(cellCost, rates, channel) * 100) / 100;

  return {
    heightsMm: PRICE_LIST_HEIGHTS.map((h) => Math.round(h * grid.heightUnitMm)),
    rows,
    baseplatePerCell: { cost: cellCost, trade: cellPrice('trade'), direct: cellPrice('direct') },
    baseplateMinimum: baseplatePrice(0, rates, 'trade'),
    cellSizeMm: `${Math.round(grid.gridUnitMm)} × ${Math.round(grid.gridUnitMmY)} mm`,
    setup: { trade: setupFeeFor(rates, 'trade'), direct: setupFeeFor(rates, 'direct') },
    delivery: rates.deliveryFee,
  };
}

/** The price list as Markdown, for a kitchen company. Client-safe wording. */
export function priceListMarkdown(
  list: PriceList,
  symbol: string,
  date: string,
  money: (n: number, symbol: string) => string
): string {
  const m = (n: number) => money(n, symbol);
  const heads = list.heightsMm.map((h) => `${h} mm high: trade / retail`);
  const out = [
    '# Trade Price List: Custom Modular Drawer Storage',
    '',
    `**Date:** ${date}`,
    '',
    'Storage bins, priced each. Sizes are the footprint in the drawer and the bin height.',
    '',
    `| Bin footprint | ${heads.join(' | ')} |`,
    `| :--- | ${heads.map(() => '---:').join(' | ')} |`,
    ...list.rows.map(
      (r) =>
        `| ${r.widthMm} × ${r.depthMm} mm | ${r.cells.map((c) => `${m(c.trade)} / ${m(c.direct)}`).join(' | ')} |`
    ),
    '',
    '### Per drawer',
    `* **Custom-fitted baseplate:** ${m(list.baseplatePerCell.trade)} per ${list.cellSizeMm} grid cell trade (${m(list.baseplatePerCell.direct)} retail), minimum ${m(list.baseplateMinimum)} per drawer`,
    `* **Measurement, layout design and setup:** ${m(list.setup.trade)} per drawer trade (${m(list.setup.direct)} retail)`,
    `* **Packaging and courier delivery:** ${m(list.delivery)} per order, or free on collection`,
    '',
    '*Retail is the suggested price to the home owner. All components are custom-manufactured to the exact drawer dimensions using high-durability material engineered for daily kitchen use.*',
    '',
  ];
  return out.join('\n');
}
