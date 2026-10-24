'use client';

import { useTranslations } from 'next-intl';
import { useRejectedChanges } from '../hooks/use.local-cache.rejected-changes';
import { LocalCacheRejectedChange } from './local-cache.rejected-change';

interface IProps {
  readonly pageId: string;
  readonly userId?: string;
}

/** The changes of this page that the server refused: what was written stays on view until the person decides. */
export const LocalCacheRejectedChanges = ({ pageId, userId }: IProps) => {
  const t = useTranslations('pages.rejectedChanges');
  const { discard, items, retry } = useRejectedChanges(userId ?? null, pageId);
  if (items.length === 0) return null;

  return (
    <section
      aria-label={t('title', { count: items.length })}
      className="mb-4 space-y-2 border border-warning/30 bg-warning/10 p-3"
      data-testid="rejected-changes"
      role="alert"
    >
      <h2 className="font-medium text-sm text-warning">{t('title', { count: items.length })}</h2>
      <p className="text-muted-foreground text-xs">{t('help')}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <LocalCacheRejectedChange
            item={item}
            key={item.id}
            onDiscard={() => void discard(item.id)}
            onRetry={() => void retry(item.id)}
          />
        ))}
      </ul>
    </section>
  );
};
