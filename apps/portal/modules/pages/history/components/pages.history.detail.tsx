'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import type { PagesHistory } from '../types/pages.history.types';
import { PagesHistoryPreview } from './pages.history.preview';

interface IProps {
  readonly canRestore: boolean;
  readonly history: PagesHistory;
  readonly onRestore: () => void;
  readonly spaceId: string;
}

export const PagesHistoryDetail = ({ canRestore, history, onRestore, spaceId }: IProps) => {
  const t = useTranslations('pages.versionHistory');

  if (history.selectedVersion === null) {
    return <p className="text-muted-foreground text-sm">{t('selectPrompt')}</p>;
  }
  if (history.previewStatus === 'error') {
    return (
      <p className="text-destructive text-sm" role="alert">
        {t('previewError')}
      </p>
    );
  }
  if (history.previewStatus !== 'ready' || history.document === null) {
    return (
      <p aria-live="polite" className="text-muted-foreground text-sm" role="status">
        {t('previewLoading')}
      </p>
    );
  }

  return (
    <section aria-label={t('previewLabel', { version: history.document.version })} className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="wrap-break-word min-w-0 font-semibold">{history.document.title}</h3>
        {canRestore ? (
          <Button className="min-h-11" onClick={onRestore} type="button">
            {t('restore')}
          </Button>
        ) : (
          <p className="text-muted-foreground text-sm">{t('readOnlyNote')}</p>
        )}
      </div>
      <div className="max-h-[60vh] overflow-y-auto border border-border p-3">
        <PagesHistoryPreview document={history.document} spaceId={spaceId} />
      </div>
    </section>
  );
};
