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
    expect(screen.getByText('Bin markup')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'True margin' }));
    expect(useQuotingStore.getState().rates.pricingMode).toBe('margin');
    expect(screen.getByText('Target margin')).toBeInTheDocument();
  });

  it('shows the VAT rate only when VAT is on', async () => {
    render(<RatesPanel />);
    expect(screen.queryByText('VAT rate')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: 'Charge VAT' }));
    expect(screen.getByText('VAT rate')).toBeInTheDocument();
  });
});
