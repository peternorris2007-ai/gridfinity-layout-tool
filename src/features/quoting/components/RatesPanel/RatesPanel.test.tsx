import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useQuotingStore } from '../../store/quotingStore';
import { RatesPanel } from './RatesPanel';

const initial = useQuotingStore.getState();

beforeEach(() => {
  localStorage.clear();
  useQuotingStore.setState(initial, true);
});

describe('RatesPanel', () => {
  it('switches between markup and true margin', async () => {
    render(<RatesPanel />);
    expect(screen.getByText('Direct bin markup')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'True margin' }));
    expect(useQuotingStore.getState().rates.pricingMode).toBe('margin');
    expect(screen.getByText('Direct target margin')).toBeInTheDocument();
  });

  it('switches trade between its own markup and a discount', async () => {
    render(<RatesPanel />);
    expect(screen.getByText('Trade bin markup')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Discount off direct' }));
    expect(useQuotingStore.getState().rates.tradePricing).toBe('discount');
    expect(screen.getByText('Trade discount')).toBeInTheDocument();
  });

  it('shows the VAT rate only when VAT is on', async () => {
    render(<RatesPanel />);
    expect(screen.queryByText('VAT rate')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: 'Charge VAT' }));
    expect(screen.getByText('VAT rate')).toBeInTheDocument();
  });
});
