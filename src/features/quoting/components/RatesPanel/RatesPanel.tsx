import type { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Button, NumberField, SegmentedControl, Switch } from '@/design-system';
import { useTranslation } from '@/i18n';
import type { BaseplatePricing, PricingMode, PricingRates } from '../../engine/rates';
import { useQuotingStore } from '../../store/quotingStore';

type NumericRate = {
  [K in keyof PricingRates]: PricingRates[K] extends number ? K : never;
}[keyof PricingRates];

interface FieldSpec {
  readonly key: NumericRate;
  readonly label: string;
  readonly unit?: string;
  /** Stored as a fraction, edited as a percentage. */
  readonly percent?: boolean;
  readonly step?: number;
  readonly max?: number;
}

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[var(--space-sm)]">
      <h3 className="text-sm font-semibold text-content-secondary">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-sm)]">{children}</div>
    </section>
  );
}

/** Every rate behind a quote, editable and saved in this browser only. */
export function RatesPanel() {
  const t = useTranslation();
  const { rates, setRate, resetRates } = useQuotingStore(
    useShallow((s) => ({ rates: s.rates, setRate: s.setRate, resetRates: s.resetRates }))
  );
  const money = rates.currencySymbol;

  const field = ({ key, label, unit, percent, step, max }: FieldSpec) => (
    <NumberField
      key={key}
      label={label}
      unit={unit}
      min={0}
      max={max}
      step={step ?? 0.01}
      value={percent ? Math.round(rates[key] * 10000) / 100 : rates[key]}
      onChange={(v) => setRate(key, percent ? v / 100 : v)}
    />
  );

  return (
    <div className="flex flex-col gap-[var(--space-xl)] text-sm">
      <p className="text-content-secondary">{t('quoting.rates.intro')}</p>

      <Section title={t('quoting.rates.production')}>
        {field({
          key: 'filamentCostPerKg',
          label: t('quoting.rates.filament'),
          unit: `${money}/kg`,
          step: 1,
        })}
        {field({
          key: 'scrapBuffer',
          label: t('quoting.rates.scrap'),
          unit: '%',
          percent: true,
          step: 1,
        })}
        {field({
          key: 'machineCostPerHour',
          label: t('quoting.rates.machine'),
          unit: `${money}/h`,
        })}
        <Switch
          size="sm"
          label={t('quoting.rates.scrapOnMachine')}
          checked={rates.applyScrapBufferToMachine}
          onChange={(v) => setRate('applyScrapBufferToMachine', v)}
        />
        {field({
          key: 'weeklyPrintHours',
          label: t('quoting.rates.weeklyHours'),
          unit: 'h',
          step: 1,
          max: 168,
        })}
      </Section>

      <Section title={t('quoting.rates.calibration')}>
        {field({ key: 'calibrationGrams', label: t('quoting.rates.calGrams'), unit: '×', max: 5 })}
        {field({ key: 'calibrationHours', label: t('quoting.rates.calHours'), unit: '×', max: 5 })}
      </Section>

      <Section title={t('quoting.rates.pricing')}>
        <SegmentedControl<PricingMode>
          aria-label={t('quoting.rates.mode')}
          size="sm"
          value={rates.pricingMode}
          onChange={(v) => setRate('pricingMode', v)}
          options={[
            { value: 'markup', label: t('quoting.rates.modeMarkup') },
            { value: 'margin', label: t('quoting.rates.modeMargin') },
          ]}
        />
        {rates.pricingMode === 'markup'
          ? field({ key: 'binMarkup', label: t('quoting.rates.markup'), unit: '×' })
          : field({
              key: 'targetMargin',
              label: t('quoting.rates.margin'),
              unit: '%',
              percent: true,
              step: 1,
              max: 95,
            })}
        <SegmentedControl<BaseplatePricing>
          aria-label={t('quoting.rates.baseplateMode')}
          size="sm"
          value={rates.baseplatePricing}
          onChange={(v) => setRate('baseplatePricing', v)}
          options={[
            { value: 'costWithMinimum', label: t('quoting.rates.baseplateCost') },
            { value: 'flat', label: t('quoting.rates.baseplateFlat') },
          ]}
        />
        {field({
          key: 'baseplatePrice',
          label:
            rates.baseplatePricing === 'flat'
              ? t('quoting.rates.baseplatePrice')
              : t('quoting.rates.baseplateMinimum'),
          unit: money,
          step: 1,
        })}
        {field({
          key: 'baseplateGramsPerCell',
          label: t('quoting.rates.baseplateGrams'),
          unit: 'g',
        })}
        {field({
          key: 'baseplateHoursPerCell',
          label: t('quoting.rates.baseplateHours'),
          unit: 'h',
        })}
      </Section>

      <Section title={t('quoting.rates.fees')}>
        {field({ key: 'setupFeePerDrawer', label: t('quoting.rates.setup'), unit: money, step: 1 })}
        {field({ key: 'labourPerPlate', label: t('quoting.rates.labour'), unit: money, step: 1 })}
        {field({ key: 'deliveryFee', label: t('quoting.rates.deliveryFee'), unit: money, step: 1 })}
        {field({
          key: 'deliveryCost',
          label: t('quoting.rates.deliveryCost'),
          unit: money,
          step: 1,
        })}
        {field({
          key: 'paymentFeePercent',
          label: t('quoting.rates.paymentFee'),
          unit: '%',
          percent: true,
          step: 0.1,
          max: 50,
        })}
        {field({
          key: 'minimumOrder',
          label: t('quoting.rates.minimumOrder'),
          unit: money,
          step: 1,
        })}
        {field({ key: 'roundTotalTo', label: t('quoting.rates.roundTo'), unit: money, step: 1 })}
        <Switch
          size="sm"
          label={t('quoting.rates.vat')}
          checked={rates.vatEnabled}
          onChange={(v) => setRate('vatEnabled', v)}
        />
        {rates.vatEnabled &&
          field({
            key: 'vatRate',
            label: t('quoting.rates.vatRate'),
            unit: '%',
            percent: true,
            step: 1,
            max: 100,
          })}
      </Section>

      <div>
        <Button variant="ghost" size="sm" onClick={resetRates}>
          {t('quoting.rates.reset')}
        </Button>
      </div>
    </div>
  );
}
