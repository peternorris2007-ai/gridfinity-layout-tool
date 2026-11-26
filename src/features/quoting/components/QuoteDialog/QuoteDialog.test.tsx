import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDefaultLayout, STAGING_ID } from '@/core/constants';
import { useLayoutStore } from '@/core/store/layout';
import type { Bin } from '@/core/types';
import { useQuotingStore } from '../../store/quotingStore';
import { QuoteDialog } from './QuoteDialog';

const initialQuoting = useQuotingStore.getState();

beforeEach(() => {
  localStorage.clear();
  useQuotingStore.setState(initialQuoting, true);
  const base = createDefaultLayout();
  useLayoutStore.setState({
    layout: {
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
    },
  });
});

describe('QuoteDialog', () => {
  it('shows the client quote and toggles delivery', async () => {
    render(<QuoteDialog open onClose={vi.fn()} />);
    expect(screen.getByText('Quote: Custom Modular Drawer Storage Solution')).toBeInTheDocument();
    expect(screen.getByText('R150.00', { selector: 'dd' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: 'Courier delivery' }));
    expect(screen.getByText('R0.00 (collection)')).toBeInTheDocument();
  });

  it('opens the internal breakdown and rates tabs', async () => {
    render(<QuoteDialog open onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Internal breakdown' }));
    expect(screen.getByText('Net profit')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Rates' }));
    expect(screen.getByText('Reset to default rates')).toBeInTheDocument();
  });
});
