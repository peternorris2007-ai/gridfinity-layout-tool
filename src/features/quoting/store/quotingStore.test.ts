import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PRICING_RATES } from '../engine/rates';
import { useQuotingStore } from './quotingStore';

const initial = useQuotingStore.getState();

beforeEach(() => {
  localStorage.clear();
  useQuotingStore.setState(initial, true);
});

describe('quotingStore', () => {
  it('edits a rate, rejecting out-of-range values', () => {
    useQuotingStore.getState().setRate('binMarkup', 1.8);
    expect(useQuotingStore.getState().rates.binMarkup).toBe(1.8);
    useQuotingStore.getState().setRate('binMarkup', -2);
    expect(useQuotingStore.getState().rates.binMarkup).toBe(DEFAULT_PRICING_RATES.binMarkup);
  });

  it('stores and clears slicer figures per layout', () => {
    const { setSlicerFigures } = useQuotingStore.getState();
    setSlicerFigures('Kitchen', 'row', { grams: 10, hours: 0.5 });
    expect(useQuotingStore.getState().slicerOverrides.Kitchen).toEqual({
      row: { grams: 10, hours: 0.5 },
    });
    setSlicerFigures('Kitchen', 'row', null);
    expect(useQuotingStore.getState().slicerOverrides.Kitchen).toEqual({});
  });

  it('resets rates to the defaults', () => {
    useQuotingStore.getState().setRate('filamentCostPerKg', 500);
    useQuotingStore.getState().resetRates();
    expect(useQuotingStore.getState().rates).toEqual(DEFAULT_PRICING_RATES);
  });
});
