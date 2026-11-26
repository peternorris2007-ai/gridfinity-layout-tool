import { useState } from 'react';
import { Button, Input } from '@/design-system';
import { useTranslation } from '@/i18n';
import type { CostedLine, Quote } from '../../engine/pricing';
import { parseDuration } from '../../engine/pricing';
import type { PricingRates } from '../../engine/rates';
import { formatMoney } from '../../engine/formatQuote';
import type { SlicerFigures } from '../../store/quotingStore';
import { BASEPLATE_ROW_KEY, type QuoteInputResult } from '../../utils/quoteInput';

interface InternalBreakdownViewProps {
  readonly quote: Quote;
  readonly alternateQuote: Quote;
  readonly rates: PricingRates;
  readonly source: QuoteInputResult;
  readonly onSlicerFigures: (rowKey: string, figures: SlicerFigures | null) => void;
}

const CELL = 'py-[var(--space-xs)] px-[var(--space-sm)] border-b border-stroke-subtle';
const NUM = `${CELL} text-right tabular-nums whitespace-nowrap`;

interface SlicerEntryProps {
  readonly item: string;
  readonly current: SlicerFigures | null;
  readonly onSave: (figures: SlicerFigures | null) => void;
}

/** Grams and print time from Bambu Studio for one line; blank = use the estimate. */
function SlicerEntry({ item, current, onSave }: SlicerEntryProps) {
  const t = useTranslation();
  const [grams, setGrams] = useState(current ? String(current.grams) : '');
  const [time, setTime] = useState(current ? String(Math.round(current.hours * 100) / 100) : '');

  const commit = () => {
    if (grams.trim() === '' && time.trim() === '') {
      onSave(null);
      return;
    }
    const g = Number(grams);
    const h = parseDuration(time);
    if (Number.isFinite(g) && g >= 0 && h !== null) onSave({ grams: g, hours: h });
  };

  return (
    <div className="flex items-center gap-[var(--space-xs)] justify-end">
      <Input
        size="sm"
        className="w-16"
        inputMode="decimal"
        value={grams}
        placeholder={t('quoting.internal.gramsPlaceholder')}
        aria-label={t('quoting.internal.slicerGrams', { item })}
        onChange={(e) => setGrams(e.target.value)}
        onBlur={commit}
      />
      <Input
        size="sm"
        className="w-20"
        value={time}
        placeholder={t('quoting.internal.timePlaceholder')}
        aria-label={t('quoting.internal.slicerTime', { item })}
        onChange={(e) => setTime(e.target.value)}
        onBlur={commit}
      />
      {current && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setGrams('');
            setTime('');
            onSave(null);
          }}
        >
          {t('quoting.internal.useEstimate')}
        </Button>
      )}
    </div>
  );
}

/** Internal viability view: costs, profit per line, print hours and capacity. */
export function InternalBreakdownView({
  quote,
  alternateQuote,
  rates,
  source,
  onSlicerFigures,
}: InternalBreakdownViewProps) {
  const t = useTranslation();
  const m = (n: number) => formatMoney(n, rates.currencySymbol);
  const i = quote.internal;
  const b = quote.setupBreakdown;
  const withDelivery = quote.deliveryLine > 0 ? quote : alternateQuote;
  const collection = quote.deliveryLine > 0 ? alternateQuote : quote;

  const row = (line: CostedLine, key: string, current: SlicerFigures | null) => (
    <tr key={key}>
      <td className={CELL}>{line.description}</td>
      <td className={NUM}>{line.quantity}</td>
      <td className={NUM}>{(line.grams * line.quantity).toFixed(0)}</td>
      <td className={NUM}>{(line.hours * line.quantity).toFixed(2)}</td>
      <td className={NUM}>{m(line.materialCost * line.quantity)}</td>
      <td className={NUM}>{m(line.machineCost * line.quantity)}</td>
      <td className={NUM}>{m(line.productionCost * line.quantity)}</td>
      <td className={NUM}>{m(line.linePrice)}</td>
      <td className={NUM}>{m(line.lineProfit)}</td>
      <td className={CELL}>
        <SlicerEntry
          key={current ? `${current.grams}/${current.hours}` : 'none'}
          item={line.description}
          current={current}
          onSave={(f) => onSlicerFigures(key, f)}
        />
      </td>
    </tr>
  );

  return (
    <div className="text-sm text-content-primary flex flex-col gap-[var(--space-md)]">
      <p className="text-content-secondary">
        {i.usesCalibratedEstimates
          ? t('quoting.internal.calibrated', {
              grams: String(rates.calibrationGrams),
              hours: String(rates.calibrationHours),
            })
          : t('quoting.internal.exact')}
        {quote.baseplate?.source === 'rate' &&
          ` ${t('quoting.internal.baseplateRate', { cells: String(source.baseplateCells) })}`}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-content-secondary">
              <th className={CELL}>{t('quoting.internal.item')}</th>
              <th className={NUM}>{t('quoting.internal.qty')}</th>
              <th className={NUM}>{t('quoting.internal.grams')}</th>
              <th className={NUM}>{t('quoting.internal.hours')}</th>
              <th className={NUM}>{t('quoting.internal.material')}</th>
              <th className={NUM}>{t('quoting.internal.machine')}</th>
              <th className={NUM}>{t('quoting.internal.production')}</th>
              <th className={NUM}>{t('quoting.internal.retail')}</th>
              <th className={NUM}>{t('quoting.internal.profit')}</th>
              <th className={`${CELL} text-right`}>{t('quoting.internal.slicer')}</th>
            </tr>
          </thead>
          <tbody>
            {source.rows.map((r, idx) => {
              const line = quote.items.at(idx);
              return line ? row(line, r.key, r.slicer) : null;
            })}
            {quote.baseplate && row(quote.baseplate, BASEPLATE_ROW_KEY, source.baseplateSlicer)}
          </tbody>
        </table>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-[var(--space-lg)] gap-y-[var(--space-xs)] max-w-md">
        <dt>{t('quoting.internal.setupFees')}</dt>
        <dd className="text-right tabular-nums">{m(b.setupFees + b.labour)}</dd>
        {b.minimumTopUp > 0 && (
          <>
            <dt>{t('quoting.internal.minimumTopUp')}</dt>
            <dd className="text-right tabular-nums">{m(b.minimumTopUp)}</dd>
          </>
        )}
        {b.roundingAdjustment !== 0 && (
          <>
            <dt>{t('quoting.internal.rounding')}</dt>
            <dd className="text-right tabular-nums">{m(b.roundingAdjustment)}</dd>
          </>
        )}
        <dt>{t('quoting.internal.revenue')}</dt>
        <dd className="text-right tabular-nums">{m(quote.subtotalExVat)}</dd>
        <dt>{t('quoting.internal.productionCost')}</dt>
        <dd className="text-right tabular-nums">{m(i.productionCost)}</dd>
        <dt>{t('quoting.internal.deliveryCost')}</dt>
        <dd className="text-right tabular-nums">{m(i.deliveryCost)}</dd>
        {i.paymentFee > 0 && (
          <>
            <dt>{t('quoting.internal.paymentFee')}</dt>
            <dd className="text-right tabular-nums">{m(i.paymentFee)}</dd>
          </>
        )}
        {rates.vatEnabled && (
          <>
            <dt>{t('quoting.internal.vat')}</dt>
            <dd className="text-right tabular-nums">{m(quote.vat)}</dd>
          </>
        )}
        <dt className="font-semibold">{t('quoting.internal.netProfit')}</dt>
        <dd className="text-right tabular-nums font-semibold">
          {t('quoting.internal.profitWithMargin', {
            amount: m(i.profit),
            percent: i.marginPercent.toFixed(1),
          })}
        </dd>
        <dt>{t('quoting.internal.profitPrinting')}</dt>
        <dd className="text-right tabular-nums">{m(i.profitExcludingLabourFees)}</dd>
        <dt>{t('quoting.internal.printTime')}</dt>
        <dd className="text-right tabular-nums">
          {t('quoting.internal.capacity', {
            hours: i.printHours.toFixed(1),
            percent: i.weeklyCapacityPercent.toFixed(0),
            week: String(rates.weeklyPrintHours),
          })}
        </dd>
        <dt>{t('quoting.internal.plates')}</dt>
        <dd className="text-right tabular-nums">{source.input.plates}</dd>
        <dt>{t('quoting.internal.withDelivery')}</dt>
        <dd className="text-right tabular-nums">
          {m(withDelivery.total)} · {m(withDelivery.internal.profit)}
        </dd>
        <dt>{t('quoting.internal.withCollection')}</dt>
        <dd className="text-right tabular-nums">
          {m(collection.total)} · {m(collection.internal.profit)}
        </dd>
      </dl>
      {rates.deliveryCost === 0 && (
        <p className="text-content-secondary">{t('quoting.internal.courierZero')}</p>
      )}
    </div>
  );
}
