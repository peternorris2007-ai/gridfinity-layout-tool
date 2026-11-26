import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_PRICING_RATES,
  sanitizeRates,
  type PriceChannel,
  type PricingRates,
} from '../engine/rates';

export const QUOTING_STORAGE_KEY = 'gridfinity-quoting-v1';

/** Exact Bambu Studio figures for one print-list row, per unit. */
export interface SlicerFigures {
  readonly grams: number;
  readonly hours: number;
}

interface QuotingState {
  rates: PricingRates;
  delivery: boolean;
  channel: PriceChannel;
  /** Keyed by layout name, then by row key (see `useQuoteInput`). */
  slicerOverrides: Partial<Record<string, Record<string, SlicerFigures>>>;
  setRate: <K extends keyof PricingRates>(key: K, value: PricingRates[K]) => void;
  resetRates: () => void;
  setDelivery: (delivery: boolean) => void;
  setChannel: (channel: PriceChannel) => void;
  setSlicerFigures: (layoutKey: string, rowKey: string, figures: SlicerFigures | null) => void;
}

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function sanitizeFigures(value: unknown): SlicerFigures | null {
  if (typeof value !== 'object' || value === null) return null;
  const { grams, hours } = value as Record<string, unknown>;
  return typeof grams === 'number' && typeof hours === 'number' && grams >= 0 && hours >= 0
    ? { grams, hours }
    : null;
}

function sanitizeOverrides(value: unknown): Record<string, Record<string, SlicerFigures>> {
  if (typeof value !== 'object' || value === null) return {};
  const out: Record<string, Record<string, SlicerFigures>> = {};
  for (const [layoutKey, rows] of Object.entries(value as Record<string, unknown>)) {
    if (typeof rows !== 'object' || rows === null) continue;
    const clean: Record<string, SlicerFigures> = {};
    for (const [rowKey, figures] of Object.entries(rows as Record<string, unknown>)) {
      const f = sanitizeFigures(figures);
      if (f) clean[rowKey] = f;
    }
    out[layoutKey] = clean;
  }
  return out;
}

export const useQuotingStore = create<QuotingState>()(
  persist(
    (set) => ({
      rates: DEFAULT_PRICING_RATES,
      delivery: true,
      channel: 'direct',
      slicerOverrides: {},
      setRate: (key, value) =>
        set((state) => ({ rates: sanitizeRates({ ...state.rates, [key]: value }) })),
      resetRates: () => set({ rates: DEFAULT_PRICING_RATES }),
      setDelivery: (delivery) => set({ delivery }),
      setChannel: (channel) => set({ channel }),
      setSlicerFigures: (layoutKey, rowKey, figures) =>
        set((state) => {
          const kept = Object.entries(state.slicerOverrides[layoutKey] ?? {}).filter(
            ([key]) => key !== rowKey
          );
          const rows = Object.fromEntries(figures ? [...kept, [rowKey, figures]] : kept);
          return { slicerOverrides: { ...state.slicerOverrides, [layoutKey]: rows } };
        }),
    }),
    {
      name: QUOTING_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof localStorage !== 'undefined' ? localStorage : noopStorage
      ),
      partialize: (state) => ({
        rates: state.rates,
        delivery: state.delivery,
        channel: state.channel,
        slicerOverrides: state.slicerOverrides,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        return {
          ...current,
          rates: sanitizeRates(p.rates),
          delivery: typeof p.delivery === 'boolean' ? p.delivery : current.delivery,
          channel: p.channel === 'trade' ? 'trade' : 'direct',
          slicerOverrides: sanitizeOverrides(p.slicerOverrides),
        };
      },
    }
  )
);
