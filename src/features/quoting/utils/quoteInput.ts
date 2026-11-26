import type { Layout } from '@/core/types';
import { STAGING_ID, calcMaxGridUnits } from '@/core/constants';
import {
  OVERHEAD_MINUTES,
  estimateStandardBinFilament,
  type PrintSettings,
} from '@/shared/printSettings';
import type { QuoteInput, QuoteItemInput } from '../engine/pricing';
import type { PricingRates } from '../engine/rates';
import type { SlicerFigures } from '../store/quotingStore';

export const BASEPLATE_ROW_KEY = '__baseplate__';

/** Mirrors the print list's bed packing allowance. */
const BED_PACKING_EFFICIENCY = 0.85;

export interface QuoteRow {
  readonly key: string;
  readonly description: string;
  readonly detail: string;
  readonly quantity: number;
  /** Tool estimate per unit, before calibration, plate warm-up excluded. */
  readonly estimate: SlicerFigures;
  readonly slicer: SlicerFigures | null;
}

export interface QuoteInputResult {
  readonly rows: readonly QuoteRow[];
  readonly baseplateCells: number;
  readonly baseplateSlicer: SlicerFigures | null;
  readonly input: QuoteInput;
}

/** Client-facing size in millimetres: nominal footprint and body height. */
export function describeBin(
  widthMm: number,
  depthMm: number,
  heightMm: number,
  label: string
): string {
  const size = `${Math.round(widthMm)} × ${Math.round(depthMm)} mm, ${Math.round(heightMm)} mm high`;
  return label.trim() ? `${label.trim()} (${size})` : `Storage bin ${size}`;
}

/** Internal-only grid size, e.g. "2×3 grid, 6u". */
export function gridSize(width: number, depth: number, height: number): string {
  return `${width}×${depth} grid, ${height}u`;
}

/**
 * Turn a layout into quote lines: placed bins grouped by size and label, a
 * plate count from the bed size, and baseplate figures from the drawer area.
 */
export function buildQuoteInput(
  layout: Layout,
  printSettings: PrintSettings,
  rates: PricingRates,
  overrides: Readonly<Partial<Record<string, SlicerFigures>>>,
  delivery: boolean
): QuoteInputResult {
  const gridUnitMmY = layout.gridUnitMmY ?? layout.gridUnitMm;
  const groups = new Map<
    string,
    { width: number; depth: number; height: number; label: string; quantity: number }
  >();
  let footprint = 0;
  for (const bin of layout.bins) {
    if (bin.layerId === STAGING_ID) continue;
    const label = bin.label.trim();
    const key = `${bin.width}x${bin.depth}x${bin.height}|${label}`;
    const g = groups.get(key);
    if (g) g.quantity += 1;
    else
      groups.set(key, {
        width: bin.width,
        depth: bin.depth,
        height: bin.height,
        label,
        quantity: 1,
      });
    footprint += bin.width * bin.depth;
  }

  const bed = calcMaxGridUnits(
    layout.printBedSize,
    layout.gridUnitMm,
    layout.printBedDepth,
    gridUnitMmY
  );
  const usable = bed.width * bed.depth * BED_PACKING_EFFICIENCY;
  const plates = footprint <= 0 ? 0 : Math.max(1, Math.ceil(footprint / Math.max(usable, 1)));

  const rows: QuoteRow[] = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, g]) => {
      const est = estimateStandardBinFilament(
        g.width,
        g.depth,
        g.height,
        printSettings,
        layout.gridUnitMm,
        layout.heightUnitMm,
        gridUnitMmY,
        layout.lowProfileBase === true
      );
      return {
        key,
        description: describeBin(
          g.width * layout.gridUnitMm,
          g.depth * gridUnitMmY,
          g.height * layout.heightUnitMm,
          g.label
        ),
        detail: gridSize(g.width, g.depth, g.height),
        quantity: g.quantity,
        estimate: {
          grams: est.gramsFilament,
          hours: Math.max(0, est.printTimeMinutes - OVERHEAD_MINUTES) / 60,
        },
        slicer: overrides[key] ?? null,
      };
    });

  // Plate warm-up is per plate, not per bin: spread it over the estimated
  // rows in proportion to their print time. Slicer figures already include it.
  const estimatedHours = rows
    .filter((r) => !r.slicer)
    .reduce((s, r) => s + r.estimate.hours * r.quantity, 0);
  const overheadHours = (plates * OVERHEAD_MINUTES) / 60;

  const items: QuoteItemInput[] = rows.map((r) => {
    if (r.slicer) {
      return {
        description: r.description,
        detail: r.detail,
        quantity: r.quantity,
        ...r.slicer,
        source: 'slicer',
      };
    }
    const share = estimatedHours > 0 ? (r.estimate.hours / estimatedHours) * overheadHours : 0;
    return {
      description: r.description,
      detail: r.detail,
      quantity: r.quantity,
      grams: r.estimate.grams,
      hours: r.estimate.hours + share,
      source: 'estimate',
    };
  });

  const baseplateCells = layout.drawer.width * layout.drawer.depth;
  const baseplateSlicer = overrides[BASEPLATE_ROW_KEY] ?? null;
  const baseplate = baseplateSlicer
    ? { ...baseplateSlicer, source: 'slicer' as const }
    : {
        grams: baseplateCells * rates.baseplateGramsPerCell,
        hours: baseplateCells * rates.baseplateHoursPerCell,
        source: 'rate' as const,
      };

  return {
    rows,
    baseplateCells,
    baseplateSlicer,
    input: { items, baseplate, drawers: 1, plates, delivery },
  };
}
