import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildQuote } from '../../engine/pricing';
import { DEFAULT_PRICING_RATES } from '../../engine/rates';
import { ClientQuoteView } from './ClientQuoteView';

function renderQuote(vatEnabled = false) {
  const rates = { ...DEFAULT_PRICING_RATES, vatEnabled };
  const quote = buildQuote(
    {
      items: [
        {
          description: 'Gridfinity PETG bin',
          detail: '2×2 grid, 6u',
          quantity: 2,
          grams: 100,
          hours: 2,
          source: 'slicer',
        },
      ],
      baseplate: { grams: 100, hours: 2, source: 'slicer' },
      drawers: 1,
      plates: 1,
      delivery: false,
    },
    rates
  );
  return render(
    <ClientQuoteView
      quote={quote}
      rates={rates}
      layoutName="Gridfinity kitchen"
      date="2026-11-26"
    />
  );
}

describe('ClientQuoteView', () => {
  it('shows descriptions and prices without trade or material names', () => {
    const { container } = renderQuote();
    expect(container.textContent).not.toMatch(/gridfinity|petg|grid,|\du\b/i);
    expect(screen.getByText('Custom-Fitted Drawer Baseplate')).toBeInTheDocument();
    expect(screen.getByText('R150.00')).toBeInTheDocument();
    expect(screen.getByText('R0.00 (collection)')).toBeInTheDocument();
  });

  it('adds VAT lines when VAT is on', () => {
    renderQuote(true);
    expect(screen.getByText('VAT (15%)')).toBeInTheDocument();
  });
});
