'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import type { PortalSidebarPageSelectionController } from '@/modules/portal/types/portal.sidebar.selection.types';

export const useSidebarPageSelection = (): PortalSidebarPageSelectionController => {
  const t = useTranslations('pages.selection');
  const [isActive, setIsActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const announcement = isActive ? t('count', { count: selectedIds.size }) : '';

  const start = useCallback((): void => {
    setIsActive(true);
    setSelectedIds(new Set());
  }, []);

  const stop = useCallback((): void => {
    setIsActive(false);
    setSelectedIds(new Set());
  }, []);

  const clearSelection = useCallback((): void => {
    setSelectedIds(new Set());
  }, []);

  const toggle = useCallback((pageId: string): void => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  }, []);

  return { announcement, clearSelection, isActive, selectedIds, start, stop, toggle };
};
