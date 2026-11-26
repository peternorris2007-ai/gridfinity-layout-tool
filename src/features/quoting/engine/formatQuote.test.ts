import { describe, it, expect } from 'vitest';
import { buildQuote, type Quote } from './pricing';
import { DEFAULT_PRICING_RATES } from './rates';
import {
  clientQuoteMarkdown,
  clientSafe,
  formatMoney,
  internalBreakdownMarkdown,
} from './formatQuote';

let cachedQuote: Quote | undefined;
const getQuote = (): Quote =>
  (cachedQuote ??= buildQuote(
    {
      items: [
        {
          description: 'Gridfinity 2×2 PETG bin',
          quantity: 3,
          grams: 100,
          hours: 2,
          source: 'estimate',
        },
      ],
      baseplate: { grams: 120, hours: 3, source: 'estimate' },
      drawers: 1,
      plates: 2,
      delivery: true,
    },
    DEFAULT_PRICING_RATES
  ));
const meta = { layoutName: 'Kitchen gridfinity drawer', date: '2026-11-26' };

describe('clientQuoteMarkdown', () => {
  const md = clientQuoteMarkdown(getQuote(), DEFAULT_PRICING_RATES, meta);

  it('never mentions trade or material names', () => {
    expect(md).not.toMatch(/gridfinity/i);
    expect(md).not.toMatch(/petg/i);
  });

  it('hides internal figures', () => {
    expect(md).not.toMatch(/\d g\b/);
    expect(md).not.toMatch(/print time|profit|machine/i);
  });

  it('follows the template', () => {
    expect(md).toContain('# Quote: Custom Modular Drawer Storage Solution');
    expect(md).toContain('**Custom-Fitted Drawer Baseplate** | R150.00');
    expect(md).toContain('**Drawer Measurement, CAD Layout & Setup** | R200.00');
    expect(md).toContain(`**Total Quote:** **${formatMoney(getQuote().total, 'R')}**`);
  });
});

describe('internalBreakdownMarkdown', () => {
  it('flags calibrated estimates and shows profit and capacity', () => {
    const md = internalBreakdownMarkdown(getQuote(), DEFAULT_PRICING_RATES, meta);
    expect(md).toContain('calibrated estimates');
    expect(md).toContain('**Profit:**');
    expect(md).toContain('40-hour print week');
  });
});

describe('helpers', () => {
  it('formats rand with thousands separators', () => {
    expect(formatMoney(1234.5, 'R')).toBe('R1,234.50');
  });
  it('rewrites trade names', () => {
    expect(clientSafe('PETG Gridfinity bin')).toBe('high-durability material modular storage bin');
  });
});
