'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { hasActionError } from '@/shared/lib/action-result';
import { resolveRowDropAnchor } from '../lib/pages.row-ordering.lib';
import { movePageRowAction } from '../server/actions/pages.collections.actions';
import type { PageBoardAnchor } from '../types/pages.board-move.types';
import type { PageRowDropSide, PagesRowOrdering } from '../types/pages.row-ordering.types';

/**
 * Puts a row beside another in the order of this view, as one write that names only the neighbour: the order of the
 * view is a list, and two people moving different rows meanwhile do not undo each other.
 */
export const usePagesRowOrdering = (pageId: string, spaceId: string, viewId: string): PagesRowOrdering => {
  const tErrors = useTranslations('errors');
  const [carried, setCarried] = useState<PagesRowOrdering['carried']>(null);
  const [isBusy, startMoving] = useTransition();

  const move = (rowId: string, anchor: PageBoardAnchor): void =>
    startMoving(async () => {
      const moved = await movePageRowAction({ ...anchor, listChanges: {}, pageId, rowId, spaceId, values: {}, viewId });
      if (hasActionError(moved)) toast.error(tErrors('generic'));
    });

  return {
    carried,
    drop: (targetRowId: string, scope: string, side: PageRowDropSide) => {
      const taken = carried;
      setCarried(null);
      if (taken === null || taken.scope !== scope || taken.rowId === targetRowId) return;
      move(taken.rowId, resolveRowDropAnchor(targetRowId, side));
    },
    forget: () => setCarried(null),
    isBusy,
    move,
    take: (rowId: string, scope: string) => setCarried({ rowId, scope }),
  };
};
