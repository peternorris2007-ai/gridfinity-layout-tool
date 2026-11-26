import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDefaultLayout, STAGING_ID } from '@/core/constants';
import type { Bin } from '@/core/types';
import { DEFAULT_PRINT_SETTINGS } from '@/shared/printSettings';
import { buildQuote } from '../../engine/pricing';
import { DEFAULT_PRICING_RATES } from '../../engine/rates';
import { buildQuoteInput } from '../../utils/quoteInput';
import { InternalBreakdownView } from './InternalBreakdownView';

function setup() {
  const base = createDefaultLayout();
  const layout = {
    ...base,
    bins: [
      {
        id: 'b1',
        layerId: base.layers[0]?.id ?? STAGING_ID,
        x: 0,
        y: 0,
        width: 2,
        depth: 2,
        height: 6,
        category: base.categories[0]?.id,
        label: 'Spices',
        notes: '',
      } as Bin,
    ],
  };
  const source = buildQuoteInput(layout, DEFAULT_PRINT_SETTINGS, DEFAULT_PRICING_RATES, {}, true);
  const quote = buildQuote(source.input, DEFAULT_PRICING_RATES);
  const alternate = buildQuote({ ...source.input, delivery: false }, DEFAULT_PRICING_RATES);
  const onSlicerFigures = vi.fn();
  render(
    <InternalBreakdownView
      quote={quote}
      alternateQuote={alternate}
      rates={DEFAULT_PRICING_RATES}
      source={source}
      onSlicerFigures={onSlicerFigures}
    />
  );
  return { onSlicerFigures, rowKey: source.rows[0]?.key };
}

describe('InternalBreakdownView', () => {
  it('flags calibrated estimates and shows profit', () => {
    setup();
    expect(screen.getByText(/calibrated estimates/)).toBeInTheDocument();
    expect(screen.getByText('Net profit')).toBeInTheDocument();
  });

  it('saves slicer figures typed as grams and h/m time', async () => {
    const { onSlicerFigures, rowKey } = setup();
    await userEvent.type(screen.getByLabelText(/Slicer grams per unit for Spices/), '42');
    await userEvent.type(screen.getByLabelText(/Slicer print time per unit for Spices/), '1h 30m');
    await userEvent.tab();
    expect(onSlicerFigures).toHaveBeenLastCalledWith(rowKey, { grams: 42, hours: 1.5 });
  });
});
