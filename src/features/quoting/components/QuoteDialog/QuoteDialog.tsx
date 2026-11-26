import { useMemo, useState } from 'react';
import { CopyButton, Dialog, SegmentedControl, Switch, Tabs } from '@/design-system';
import { useLayoutStore } from '@/core/store/layout';
import { useSettingsStore } from '@/core/store/settings';
import { useViewStore } from '@/core/store/view';
import { useTranslation } from '@/i18n';
import { useQuote } from '../../hooks/useQuote';
import {
  clientQuoteMarkdown,
  formatMoney,
  internalBreakdownMarkdown,
} from '../../engine/formatQuote';
import type { PriceChannel } from '../../engine/rates';
import { useQuotingStore } from '../../store/quotingStore';
import { buildPriceList, priceListMarkdown } from '../../utils/priceList';
import { ClientQuoteView } from '../ClientQuoteView';
import { InternalBreakdownView } from '../InternalBreakdownView';
import { PriceListView } from '../PriceListView';
import { RatesPanel } from '../RatesPanel';

type QuoteTab = 'client' | 'internal' | 'priceList' | 'rates';

interface QuoteDialogProps {
  readonly open?: boolean;
  /** Defaults to closing through the view store. */
  readonly onClose?: () => void;
}

const closeQuote = () => useViewStore.getState().setQuoteOpen(false);

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function QuoteDialog({ open = true, onClose = closeQuote }: QuoteDialogProps) {
  const t = useTranslation();
  const [tab, setTab] = useState<QuoteTab>('client');
  const { layoutName, rates, delivery, channel, source, quote, alternateQuote, otherChannelQuote } =
    useQuote();
  const setDelivery = useQuotingStore((s) => s.setDelivery);
  const setChannel = useQuotingStore((s) => s.setChannel);
  const setSlicerFigures = useQuotingStore((s) => s.setSlicerFigures);
  const layout = useLayoutStore((s) => s.layout);
  const printSettings = useSettingsStore((s) => s.settings.printSettings);
  const priceList = useMemo(
    () =>
      buildPriceList(
        {
          gridUnitMm: layout.gridUnitMm,
          gridUnitMmY: layout.gridUnitMmY ?? layout.gridUnitMm,
          heightUnitMm: layout.heightUnitMm,
        },
        printSettings,
        rates
      ),
    [layout.gridUnitMm, layout.gridUnitMmY, layout.heightUnitMm, printSettings, rates]
  );
  const date = today();
  const meta = { layoutName, date, channel };
  const empty = quote.items.length === 0;
  const emptyNote = <p className="text-sm text-content-secondary">{t('quoting.empty')}</p>;

  const copyText = () => {
    if (tab === 'priceList')
      return priceListMarkdown(priceList, rates.currencySymbol, date, formatMoney);
    return tab === 'client'
      ? clientQuoteMarkdown(quote, rates, meta)
      : internalBreakdownMarkdown(quote, rates, meta);
  };
  const canCopy = tab === 'priceList' || (!empty && tab !== 'rates');

  return (
    <Dialog.Root open={open} onClose={onClose} size="5xl" height="fixed" fullScreen="mobile">
      <Dialog.Header title={t('quoting.title')} bordered closeAriaLabel={t('common.close')} />
      <Dialog.Body>
        <Tabs.Root>
          <Tabs.List<QuoteTab>
            tabs={[
              { id: 'client', label: t('quoting.tabs.client') },
              { id: 'internal', label: t('quoting.tabs.internal') },
              { id: 'priceList', label: t('quoting.tabs.priceList') },
              { id: 'rates', label: t('quoting.tabs.rates') },
            ]}
            activeTab={tab}
            onChange={setTab}
            aria-label={t('quoting.tabs.label')}
          />
          <Tabs.Panel tabId="client" activeTab={tab} className="pt-[var(--space-lg)]">
            {empty ? (
              emptyNote
            ) : (
              <ClientQuoteView
                quote={quote}
                rates={rates}
                layoutName={layoutName}
                date={date}
                channel={channel}
              />
            )}
          </Tabs.Panel>
          <Tabs.Panel tabId="internal" activeTab={tab} className="pt-[var(--space-lg)]">
            {empty ? (
              emptyNote
            ) : (
              <InternalBreakdownView
                quote={quote}
                alternateQuote={alternateQuote}
                otherChannelQuote={otherChannelQuote}
                channel={channel}
                rates={rates}
                source={source}
                onSlicerFigures={(rowKey, figures) => setSlicerFigures(layoutName, rowKey, figures)}
              />
            )}
          </Tabs.Panel>
          <Tabs.Panel tabId="priceList" activeTab={tab} className="pt-[var(--space-lg)]">
            <PriceListView list={priceList} symbol={rates.currencySymbol} />
          </Tabs.Panel>
          <Tabs.Panel tabId="rates" activeTab={tab} className="pt-[var(--space-lg)]">
            <RatesPanel />
          </Tabs.Panel>
        </Tabs.Root>
      </Dialog.Body>
      <Dialog.Footer bordered>
        <div className="flex w-full flex-wrap items-center justify-between gap-[var(--space-md)]">
          <div className="flex items-center gap-[var(--space-lg)]">
            <SegmentedControl<PriceChannel>
              aria-label={t('quoting.channel')}
              size="sm"
              value={channel}
              onChange={setChannel}
              options={[
                { value: 'direct', label: t('quoting.channelDirect') },
                { value: 'trade', label: t('quoting.channelTrade') },
              ]}
            />
            <Switch
              size="sm"
              label={t('quoting.delivery')}
              checked={delivery}
              onChange={setDelivery}
            />
          </div>
          {canCopy && (
            <CopyButton
              value={copyText}
              aria-label={t('quoting.copy')}
              label={t('quoting.copy')}
              copiedLabel={t('quoting.copied')}
            />
          )}
        </div>
      </Dialog.Footer>
    </Dialog.Root>
  );
}
