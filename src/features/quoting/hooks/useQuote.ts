import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useLayoutStore } from '@/core/store/layout';
import { useSettingsStore } from '@/core/store/settings';
import { buildQuote, type Quote } from '../engine/pricing';
import type { PricingRates } from '../engine/rates';
import { useQuotingStore } from '../store/quotingStore';
import { buildQuoteInput, type QuoteInputResult } from '../utils/quoteInput';

export interface UseQuoteReturn {
  readonly layoutName: string;
  readonly rates: PricingRates;
  readonly delivery: boolean;
  readonly source: QuoteInputResult;
  readonly quote: Quote;
  /** The same order quoted the other way round on delivery, for comparison. */
  readonly alternateQuote: Quote;
}

const EMPTY_OVERRIDES = {};

export function useQuote(): UseQuoteReturn {
  const layout = useLayoutStore((s) => s.layout);
  const printSettings = useSettingsStore((s) => s.settings.printSettings);
  const { rates, delivery, overrides } = useQuotingStore(
    useShallow((s) => ({
      rates: s.rates,
      delivery: s.delivery,
      overrides: s.slicerOverrides[layout.name] ?? EMPTY_OVERRIDES,
    }))
  );

  return useMemo(() => {
    const source = buildQuoteInput(layout, printSettings, rates, overrides, delivery);
    return {
      layoutName: layout.name,
      rates,
      delivery,
      source,
      quote: buildQuote(source.input, rates),
      alternateQuote: buildQuote({ ...source.input, delivery: !delivery }, rates),
    };
  }, [layout, printSettings, rates, overrides, delivery]);
}
