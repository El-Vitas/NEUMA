'use client';

import { useTranslations } from 'next-intl';
import { useOptimistic, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { callAction, hasActionError, isActionSuccess } from '@/shared/lib/action-result';
import {
  changePageRowRelationAction,
  listPageRelationCandidatesAction,
} from '../server/actions/pages.collections.actions';
import type { PagesRelationEditing, PagesRelationEditingInput } from '../types/pages.relation-editing.types';
import type { PageRelatedRow } from '../types/pages.schema.types';
import { usePagesCollectionLookups } from './use.pages.collection-lookups';

const withChange = (
  current: readonly string[],
  change: { readonly id: string; readonly kind: 'ADD' | 'REMOVE' },
): readonly string[] => {
  if (change.kind === 'REMOVE') return current.filter((id) => id !== change.id);
  return current.includes(change.id) ? current : [...current, change.id];
};

/** One row at a time: the server merges two people's edits to the same cell, so nothing is sent as a whole list. */
export const usePagesRelationEditing = ({
  collectionId,
  propertyKey,
  rowId,
  spaceId,
  value,
}: PagesRelationEditingInput): PagesRelationEditing => {
  const t = useTranslations('pages.properties');
  const tErrors = useTranslations('errors');
  const lookups = usePagesCollectionLookups();
  const [isChanging, startChanging] = useTransition();
  const [candidates, setCandidates] = useState<readonly PageRelatedRow[] | null>(null);
  const [picked, setPicked] = useState<readonly PageRelatedRow[]>([]);
  const [shownIds, showChange] = useOptimistic(value, withChange);
  const latestAsk = useRef(0);

  const change = (kind: 'ADD' | 'REMOVE', target: PageRelatedRow): void => {
    startChanging(async () => {
      showChange({ id: target.id, kind });
      const saved = await callAction(() =>
        changePageRowRelationAction({
          change: kind,
          propertyKey,
          rowId,
          spaceId,
          targetId: target.id,
        }),
      );
      if (isActionSuccess<string>(saved) && saved.data === 'MIRROR_FORBIDDEN') {
        toast.error(t('relationMirrorForbidden'));
        return;
      }
      if (hasActionError(saved)) {
        toast.error(tErrors('generic'));
        return;
      }
      if (kind === 'ADD') setPicked((current) => [...current, target]);
    });
  };

  const loadCandidates = (search = ''): void => {
    latestAsk.current += 1;
    const ask = latestAsk.current;
    startChanging(async () => {
      const listed = await callAction(() => listPageRelationCandidatesAction({ collectionId, search, spaceId }));
      if (ask !== latestAsk.current) return;
      if (!isActionSuccess<readonly PageRelatedRow[]>(listed)) {
        toast.error(t('relationLoadError'));
        return;
      }
      setCandidates(listed.data);
    });
  };

  const titles = [...lookups.relatedRows, ...picked, ...(candidates ?? [])];

  return {
    add: (target) => change('ADD', target),
    candidates,
    isChanging,
    loadCandidates,
    remove: (target) => change('REMOVE', target),
    shown: shownIds.map((id) => titles.find((row) => row.id === id) ?? { id, title: '' }),
  };
};
