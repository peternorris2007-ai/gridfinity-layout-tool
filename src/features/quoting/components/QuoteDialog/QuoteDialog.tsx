import { useState } from 'react';
import { CopyButton, Dialog, Switch, Tabs } from '@/design-system';
import { useViewStore } from '@/core/store/view';
import { useTranslation } from '@/i18n';
import { useQuote } from '../../hooks/useQuote';
import { clientQuoteMarkdown, internalBreakdownMarkdown } from '../../engine/formatQuote';
import { useQuotingStore } from '../../store/quotingStore';
import { ClientQuoteView } from '../ClientQuoteView';
import { InternalBreakdownView } from '../InternalBreakdownView';
import { RatesPanel } from '../RatesPanel';

type QuoteTab = 'client' | 'internal' | 'rates';

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
  const { layoutName, rates, delivery, source, quote, alternateQuote } = useQuote();
  const setDelivery = useQuotingStore((s) => s.setDelivery);
  const setSlicerFigures = useQuotingStore((s) => s.setSlicerFigures);
  const date = today();
  const meta = { layoutName, date };
  const empty = quote.items.length === 0;

  return (
    <Dialog.Root open={open} onClose={onClose} size="5xl" height="fixed" fullScreen="mobile">
      <Dialog.Header title={t('quoting.title')} bordered closeAriaLabel={t('common.close')} />
      <Dialog.Body>
        <Tabs.Root>
          <Tabs.List<QuoteTab>
            tabs={[
              { id: 'client', label: t('quoting.tabs.client') },
              { id: 'internal', label: t('quoting.tabs.internal') },
              { id: 'rates', label: t('quoting.tabs.rates') },
            ]}
            activeTab={tab}
            onChange={setTab}
            aria-label={t('quoting.tabs.label')}
          />
          <Tabs.Panel tabId="client" activeTab={tab} className="pt-[var(--space-lg)]">
            {empty ? (
              <p className="text-sm text-content-secondary">{t('quoting.empty')}</p>
            ) : (
              <ClientQuoteView quote={quote} rates={rates} layoutName={layoutName} date={date} />
            )}
          </Tabs.Panel>
          <Tabs.Panel tabId="internal" activeTab={tab} className="pt-[var(--space-lg)]">
            {empty ? (
              <p className="text-sm text-content-secondary">{t('quoting.empty')}</p>
            ) : (
              <InternalBreakdownView
                quote={quote}
                alternateQuote={alternateQuote}
                rates={rates}
                source={source}
                onSlicerFigures={(rowKey, figures) => setSlicerFigures(layoutName, rowKey, figures)}
              />
            )}
          </Tabs.Panel>
          <Tabs.Panel tabId="rates" activeTab={tab} className="pt-[var(--space-lg)]">
            <RatesPanel />
          </Tabs.Panel>
        </Tabs.Root>
      </Dialog.Body>
      <Dialog.Footer bordered>
        <div className="flex w-full items-center justify-between gap-[var(--space-md)]">
          <Switch
            size="sm"
            label={t('quoting.delivery')}
            checked={delivery}
            onChange={setDelivery}
          />
          {!empty && tab !== 'rates' && (
            <CopyButton
              value={() =>
                tab === 'client'
                  ? clientQuoteMarkdown(quote, rates, meta)
                  : internalBreakdownMarkdown(quote, rates, meta)
              }
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
