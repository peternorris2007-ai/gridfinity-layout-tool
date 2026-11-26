import { useTranslation } from '@/i18n';
import type { Quote } from '../../engine/pricing';
import type { PricingRates } from '../../engine/rates';
import { clientSafe, formatMoney } from '../../engine/formatQuote';

interface ClientQuoteViewProps {
  readonly quote: Quote;
  readonly rates: PricingRates;
  readonly layoutName: string;
  readonly date: string;
}

const CELL = 'py-[var(--space-xs)] px-[var(--space-sm)] border-b border-stroke-subtle';

/** The client-facing quote: descriptions and prices only, no trade or material names. */
export function ClientQuoteView({ quote, rates, layoutName, date }: ClientQuoteViewProps) {
  const t = useTranslation();
  const m = (n: number) => formatMoney(n, rates.currencySymbol);

  return (
    <article className="text-sm text-content-primary flex flex-col gap-[var(--space-md)]">
      <h2 className="text-lg font-semibold">{t('quoting.client.heading')}</h2>
      <div>
        <p>
          <strong>{t('quoting.client.project')}</strong> {clientSafe(layoutName)}
        </p>
        <p>
          <strong>{t('quoting.client.date')}</strong> {date}
        </p>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-content-secondary">
            <th className={CELL}>{t('quoting.client.item')}</th>
            <th className={`${CELL} text-right`}>{t('quoting.client.price')}</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((line) => (
            <tr key={line.description}>
              <td className={CELL}>
                {clientSafe(line.description)}
                {line.quantity > 1 && ` (×${line.quantity})`}
              </td>
              <td className={`${CELL} text-right tabular-nums`}>{m(line.linePrice)}</td>
            </tr>
          ))}
          {quote.baseplate && (
            <tr>
              <td className={`${CELL} font-semibold`}>{t('quoting.client.baseplate')}</td>
              <td className={`${CELL} text-right tabular-nums`}>{m(quote.baseplate.linePrice)}</td>
            </tr>
          )}
          <tr>
            <td className={`${CELL} font-semibold`}>{t('quoting.client.setup')}</td>
            <td className={`${CELL} text-right tabular-nums`}>{m(quote.setupLine)}</td>
          </tr>
        </tbody>
      </table>
      <section>
        <h3 className="font-semibold mb-[var(--space-xs)]">{t('quoting.client.summary')}</h3>
        <dl className="grid grid-cols-[1fr_auto] gap-x-[var(--space-lg)] gap-y-[var(--space-xs)]">
          <dt>{t('quoting.client.components')}</dt>
          <dd className="text-right tabular-nums">{m(quote.componentsTotal)}</dd>
          <dt>{t('quoting.client.setupFee')}</dt>
          <dd className="text-right tabular-nums">{m(quote.setupLine)}</dd>
          <dt>{t('quoting.client.delivery')}</dt>
          <dd className="text-right tabular-nums">
            {quote.deliveryLine > 0
              ? m(quote.deliveryLine)
              : t('quoting.client.collection', { amount: m(0) })}
          </dd>
          {quote.paymentFee > 0 && (
            <>
              <dt>{t('quoting.client.paymentFee')}</dt>
              <dd className="text-right tabular-nums">{m(quote.paymentFee)}</dd>
            </>
          )}
          {rates.vatEnabled && (
            <>
              <dt>{t('quoting.client.subtotalExVat')}</dt>
              <dd className="text-right tabular-nums">{m(quote.subtotalExVat)}</dd>
              <dt>{t('quoting.client.vat', { rate: String(Math.round(rates.vatRate * 100)) })}</dt>
              <dd className="text-right tabular-nums">{m(quote.vat)}</dd>
            </>
          )}
          <dt className="font-semibold">{t('quoting.client.total')}</dt>
          <dd className="text-right tabular-nums font-semibold">{m(quote.total)}</dd>
        </dl>
      </section>
      <p className="italic text-content-secondary">{t('quoting.client.note')}</p>
    </article>
  );
}
