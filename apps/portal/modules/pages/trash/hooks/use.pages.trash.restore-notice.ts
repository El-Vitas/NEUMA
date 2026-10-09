'use client';

import { useTranslations } from 'next-intl';
import { resolvePageRestoreNotice } from '../lib/pages.trash.lib';
import type { TrashRestoreOutcome } from '../types/pages.trash.types';

export const usePageRestoreNotice = (): ((title: string, outcome: TrashRestoreOutcome) => string) => {
  const t = useTranslations('pages');

  return (title, outcome) => {
    const named = title.length > 0 ? title : t('untitled');
    const notice = resolvePageRestoreNotice(outcome);
    switch (notice.kind) {
      case 'toRoot':
        return t('restoreNotice.toRoot', { page: named, space: notice.space });
      case 'underParent':
        return t('restoreNotice.underParent', { page: named, parent: notice.parent });
      default:
        return t('restored');
    }
  };
};
