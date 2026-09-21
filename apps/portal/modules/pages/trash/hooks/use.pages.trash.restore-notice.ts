'use client';

import { useTranslations } from 'next-intl';
import { resolvePageRestoreNotice } from '../lib/pages.trash.lib';
import type { TrashRestoreOutcome } from '../types/pages.trash.types';

/**
 * Qué se le dice a quien acaba de sacar una página de la papelera.
 *
 * Una página restaurada no siempre vuelve al mismo sitio, así que el aviso
 * nombra dónde quedó. Se restaura desde la papelera y también desde el
 * costado, deshaciendo un borrado recién hecho, y en los dos sitios se dice
 * igual.
 */
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
