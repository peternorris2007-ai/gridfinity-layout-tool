import { describe, expect, it } from 'vitest';
import { DEFAULT_PRINT_SETTINGS } from '@/shared/printSettings';
import { formatMoney } from '../engine/formatQuote';
import { DEFAULT_PRICING_RATES } from '../engine/rates';
import { buildPriceList, priceListMarkdown, roundListPrice } from './priceList';

const grid = { gridUnitMm: 42, gridUnitMmY: 42, heightUnitMm: 7 };

describe('buildPriceList', () => {
  const list = buildPriceList(grid, DEFAULT_PRINT_SETTINGS, DEFAULT_PRICING_RATES);

  it('prices every size in trade at or below retail, rounded to R5', () => {
    for (const row of list.rows) {
      for (const c of row.cells) {
        expect(c.trade).toBeLessThanOrEqual(c.direct);
        expect(c.trade % 5).toBe(0);
        expect(c.trade).toBeGreaterThan(c.cost);
      }
    }
  });

  it('prices bigger bins higher', () => {
    const small = list.rows[0]?.cells[0]?.trade ?? 0;
    const large = list.rows.at(-1)?.cells.at(-1)?.trade ?? 0;
    expect(large).toBeGreaterThan(small);
  });

  it('lists sizes in millimetres and heights in mm', () => {
    expect(list.rows[0]).toMatchObject({ widthMm: 42, depthMm: 42 });
    expect(list.heightsMm).toEqual([21, 42, 56]);
  });

  it('renders client-safe Markdown', () => {
    const md = priceListMarkdown(list, 'R', '2026-11-26', formatMoney);
    expect(md).toContain('# Trade Price List');
    expect(md).not.toMatch(/gridfinity|petg/i);
  });
});

describe('roundListPrice', () => {
  it('rounds up to the next R5', () => {
    expect(roundListPrice(61.01)).toBe(65);
    expect(roundListPrice(60)).toBe(60);
  });
});
