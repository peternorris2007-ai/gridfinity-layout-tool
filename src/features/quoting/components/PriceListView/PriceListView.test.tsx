import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DEFAULT_PRINT_SETTINGS } from '@/shared/printSettings';
import { DEFAULT_PRICING_RATES } from '../../engine/rates';
import { buildPriceList } from '../../utils/priceList';
import { PriceListView } from './PriceListView';

describe('PriceListView', () => {
  it('shows sizes in millimetres with trade and retail prices', () => {
    const list = buildPriceList(
      { gridUnitMm: 42, gridUnitMmY: 42, heightUnitMm: 7 },
      DEFAULT_PRINT_SETTINGS,
      DEFAULT_PRICING_RATES
    );
    const { container } = render(<PriceListView list={list} symbol="R" />);
    expect(screen.getByText('42 × 42 mm')).toBeInTheDocument();
    expect(screen.getByText('56 mm high')).toBeInTheDocument();
    expect(screen.getAllByText(/^retail R/).length).toBe(list.rows.length * 3);
    expect(container.textContent).not.toMatch(/gridfinity|petg/i);
  });
});
