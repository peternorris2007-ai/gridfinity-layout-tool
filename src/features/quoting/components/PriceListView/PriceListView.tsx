import { useTranslation } from '@/i18n';
import { formatMoney } from '../../engine/formatQuote';
import type { PriceList } from '../../utils/priceList';

interface PriceListViewProps {
  readonly list: PriceList;
  readonly symbol: string;
}

const CELL = 'py-[var(--space-xs)] px-[var(--space-sm)] border-b border-stroke-subtle';
const NUM = `${CELL} text-right tabular-nums whitespace-nowrap`;

/** Trade price list for a kitchen company: bin prices by size, plus per-drawer charges. */
export function PriceListView({ list, symbol }: PriceListViewProps) {
  const t = useTranslation();
  const m = (n: number) => formatMoney(n, symbol);

  return (
    <div className="text-sm text-content-primary flex flex-col gap-[var(--space-md)]">
      <h2 className="text-lg font-semibold">{t('quoting.priceList.heading')}</h2>
      <p className="text-content-secondary">{t('quoting.priceList.intro')}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-content-secondary">
              <th className={CELL}>{t('quoting.priceList.footprint')}</th>
              {list.heightsMm.map((h) => (
                <th key={h} className={NUM}>
                  {t('quoting.priceList.height', { mm: String(h) })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.rows.map((r) => (
              <tr key={`${r.widthUnits}x${r.depthUnits}`}>
                <td className={CELL}>
                  {t('quoting.priceList.size', { w: String(r.widthMm), d: String(r.depthMm) })}
                </td>
                {r.cells.map((c) => (
                  <td key={c.heightUnits} className={NUM}>
                    <span className="font-semibold">{m(c.trade)}</span>
                    <span className="block text-xs text-content-secondary">
                      {t('quoting.priceList.retail', { amount: m(c.direct) })}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-[var(--space-lg)] gap-y-[var(--space-xs)] max-w-xl">
        <dt>{t('quoting.priceList.baseplate', { cell: list.cellSizeMm })}</dt>
        <dd className="text-right tabular-nums">
          {t('quoting.priceList.tradeRetail', {
            trade: m(list.baseplatePerCell.trade),
            retail: m(list.baseplatePerCell.direct),
          })}
        </dd>
        <dt>{t('quoting.priceList.baseplateMinimum')}</dt>
        <dd className="text-right tabular-nums">{m(list.baseplateMinimum)}</dd>
        <dt>{t('quoting.priceList.setup')}</dt>
        <dd className="text-right tabular-nums">
          {t('quoting.priceList.tradeRetail', {
            trade: m(list.setup.trade),
            retail: m(list.setup.direct),
          })}
        </dd>
        <dt>{t('quoting.priceList.delivery')}</dt>
        <dd className="text-right tabular-nums">{m(list.delivery)}</dd>
      </dl>
      <p className="text-content-secondary">{t('quoting.priceList.note')}</p>
    </div>
  );
}
