'use client';

import { useTranslations } from 'next-intl';
import { useContext } from 'react';
import { PAGE_VIEW_WRITES_CONTEXT } from '../constants/pages.view-writes.context.constants';

/** Says how many changes of the views wait for the network, and warns when closing the tab would lose them. */
export const PagesCollectionPendingWrites = () => {
  const t = useTranslations('pages.collection');
  const { isPersistent, pendingCount } = useContext(PAGE_VIEW_WRITES_CONTEXT);
  if (pendingCount === 0) return null;

  return (
    <p className="px-1 text-muted-foreground text-xs" data-testid="collection-pending-writes" role="status">
      {t('pendingWrites', { count: pendingCount })}
      {!isPersistent && ` ${t('pendingWritesLost')}`}
    </p>
  );
};
