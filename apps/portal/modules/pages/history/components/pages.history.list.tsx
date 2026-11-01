'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import type { PagesHistory } from '../types/pages.history.types';
import { PagesHistoryItem } from './pages.history.item';

interface IProps {
  readonly history: PagesHistory;
}

export const PagesHistoryList = ({ history }: IProps) => {
  const t = useTranslations('pages.versionHistory');
  const tCommon = useTranslations('common');

  if (history.listStatus === 'error') {
    return (
      <div className="space-y-2" role="alert">
        <p className="text-destructive text-sm">{t('loadError')}</p>
        <Button className="min-h-11" onClick={history.loadFirstPage} type="button" variant="outline">
          {tCommon('retry')}
        </Button>
      </div>
    );
  }
  if (history.listStatus !== 'ready') {
    return (
      <p aria-live="polite" className="text-muted-foreground text-sm" role="status">
        {t('loading')}
      </p>
    );
  }
  if (history.items.length === 0) return <p className="text-muted-foreground text-sm">{t('empty')}</p>;

  return (
    <nav aria-label={t('listLabel')} className="space-y-2">
      <ul className="space-y-1">
        {history.items.map((summary) => (
          <PagesHistoryItem
            isSelected={summary.version === history.selectedVersion}
            key={summary.version}
            onSelect={history.select}
            summary={summary}
          />
        ))}
      </ul>
      {history.didLoadMoreFail && (
        <p className="text-destructive text-sm" role="alert">
          {t('loadMoreError')}
        </p>
      )}
      {history.hasMore && (
        <Button
          className="min-h-11 w-full"
          disabled={history.isLoadingMore}
          onClick={history.loadMore}
          type="button"
          variant="outline"
        >
          {history.isLoadingMore ? t('loadingMore') : t('loadMore')}
        </Button>
      )}
    </nav>
  );
};
