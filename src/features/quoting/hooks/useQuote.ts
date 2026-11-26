import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useLayoutStore } from '@/core/store/layout';
import { useSettingsStore } from '@/core/store/settings';
import { buildQuote, type Quote } from '../engine/pricing';
import type { PriceChannel, PricingRates } from '../engine/rates';
import { useQuotingStore } from '../store/quotingStore';
import { buildQuoteInput, type QuoteInputResult } from '../utils/quoteInput';

export interface UseQuoteReturn {
  readonly layoutName: string;
  readonly rates: PricingRates;
  readonly delivery: boolean;
  readonly channel: PriceChannel;
  readonly source: QuoteInputResult;
  readonly quote: Quote;
  /** The same order quoted the other way round on delivery, for comparison. */
  readonly alternateQuote: Quote;
  /** The same order priced for the other channel (trade vs direct). */
  readonly otherChannelQuote: Quote;
}

const EMPTY_OVERRIDES = {};

export function useQuote(): UseQuoteReturn {
  const layout = useLayoutStore((s) => s.layout);
  const printSettings = useSettingsStore((s) => s.settings.printSettings);
  const { rates, delivery, channel, overrides } = useQuotingStore(
    useShallow((s) => ({
      rates: s.rates,
      delivery: s.delivery,
      channel: s.channel,
      overrides: s.slicerOverrides[layout.name] ?? EMPTY_OVERRIDES,
    }))
  );

  return useMemo(() => {
    const source = buildQuoteInput(layout, printSettings, rates, overrides, delivery);
    const input = { ...source.input, channel };
    return {
      layoutName: layout.name,
      rates,
      delivery,
      channel,
      source,
      quote: buildQuote(input, rates),
      alternateQuote: buildQuote({ ...input, delivery: !delivery }, rates),
      otherChannelQuote: buildQuote(
        { ...input, channel: channel === 'trade' ? 'direct' : 'trade' },
        rates
      ),
    };
  }, [layout, printSettings, rates, overrides, delivery, channel]);
}
