import { describe, it, expect } from 'vitest';
import { createDefaultLayout, STAGING_ID } from '@/core/constants';
import { gridUnits, type Bin, type Layout } from '@/core/types';
import { DEFAULT_PRINT_SETTINGS } from '@/shared/printSettings';
import { DEFAULT_PRICING_RATES } from '../engine/rates';
import { BASEPLATE_ROW_KEY, buildQuoteInput, describeBin } from './quoteInput';

function layoutWith(bins: Partial<Bin>[]): Layout {
  const base = createDefaultLayout();
  const layerId = base.layers[0]?.id ?? STAGING_ID;
  return {
    ...base,
    bins: bins.map(
      (b, i) =>
        ({
          id: `b${i}`,
          layerId,
          x: 0,
          y: 0,
          width: 2,
          depth: 2,
          height: 6,
          category: base.categories[0]?.id,
          label: '',
          notes: '',
          ...b,
        }) as Bin
    ),
  };
}

const run = (layout: Layout, overrides = {}) =>
  buildQuoteInput(layout, DEFAULT_PRINT_SETTINGS, DEFAULT_PRICING_RATES, overrides, true);

describe('buildQuoteInput', () => {
  it('groups placed bins by size and label, ignoring staged ones', () => {
    const r = run(
      layoutWith([{}, {}, { label: 'Spices' }, { layerId: STAGING_ID }, { width: gridUnits(1) }])
    );
    expect(r.rows.map((row) => row.quantity).sort()).toEqual([1, 1, 2]);
    expect(r.input.items).toHaveLength(3);
    expect(r.input.items.every((i) => i.source === 'estimate')).toBe(true);
  });

  it('spreads plate warm-up across estimated rows so totals include it', () => {
    const r = run(layoutWith([{}, {}]));
    const extrusion = r.rows.reduce((s, row) => s + row.estimate.hours * row.quantity, 0);
    const quoted = r.input.items.reduce((s, i) => s + i.hours * i.quantity, 0);
    expect(r.input.plates).toBe(1);
    expect(quoted - extrusion).toBeCloseTo(16 / 60, 6);
  });

  it('uses slicer figures where entered', () => {
    const first = run(layoutWith([{}]));
    const key = first.rows[0]?.key ?? '';
    const r = run(layoutWith([{}]), { [key]: { grams: 50, hours: 1 } });
    expect(r.input.items[0]).toMatchObject({ grams: 50, hours: 1, source: 'slicer' });
  });

  it('prices the baseplate from drawer cells unless slicer figures are given', () => {
    const layout = layoutWith([{}]);
    const cells = layout.drawer.width * layout.drawer.depth;
    expect(run(layout).input.baseplate).toMatchObject({
      grams: cells * DEFAULT_PRICING_RATES.baseplateGramsPerCell,
      source: 'rate',
    });
    expect(run(layout, { [BASEPLATE_ROW_KEY]: { grams: 300, hours: 6 } }).input.baseplate).toEqual({
      grams: 300,
      hours: 6,
      source: 'slicer',
    });
  });
});

describe('describeBin', () => {
  it('names labelled and unlabelled bins', () => {
    expect(describeBin(84, 126, 42, 'Spices')).toBe('Spices (84 × 126 mm, 42 mm high)');
    expect(describeBin(42, 42, 21, ' ')).toBe('Storage bin 42 × 42 mm, 21 mm high');
  });

  it('describes placed bins in millimetres for the client and grid units internally', () => {
    const r = run(layoutWith([{ label: 'Spices' }]));
    expect(r.rows[0]?.description).toBe('Spices (84 × 84 mm, 42 mm high)');
    expect(r.rows[0]?.detail).toBe('2×2 grid, 6u');
  });
});
