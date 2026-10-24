'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { callAction, hasActionError, isActionSuccess } from '@/shared/lib/action-result';
import { browserLogger } from '../../lib/pages.browser-logger.lib';
import { duplicatePageAction, restorePageAction, trashPageAction } from '../../server/actions/pages.actions';
import type { PageSummary } from '../../types/pages.types';
import { PAGE_BULK_CONCURRENCY, PAGE_BULK_UNDO_DURATION } from '../constants/pages.row-context.constants';
import { mapWithConcurrency } from '../lib/pages.bulk-concurrency.lib';
import { updatePageRowPropertiesAction } from '../server/actions/pages.collections.actions';
import type { PagesBulkEditing } from '../types/pages.bulk-editing.types';
import type { PagePropertyValue, PagePropertyValues } from '../types/pages.schema.types';

/** One request per row, since the server answers per row, a few at a time. Each operation keeps what its undo needs. */
export const usePagesBulkEditing = (
  spaceId: string,
  valuesByRow: Readonly<Record<string, PagePropertyValues>>,
  onDone: () => void,
): PagesBulkEditing => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const [isWorking, startWorking] = useTransition();

  /** Runs one request per item with progress on screen; the answers come back in the order of the items. */
  const runWithProgress = async <Answer>(
    items: readonly string[],
    work: (item: string) => Promise<Answer>,
  ): Promise<readonly Answer[]> => {
    const toastId = toast.loading(t('bulkProgress', { done: 0, total: items.length }));
    try {
      return await mapWithConcurrency(items, PAGE_BULK_CONCURRENCY, work, (done) => {
        toast.loading(t('bulkProgress', { done, total: items.length }), { id: toastId });
      });
    } finally {
      toast.dismiss(toastId);
    }
  };

  /** True only when every row went; the rows that did not are named in the log and counted for the person. */
  const reportUndo = (rowIds: readonly string[], went: readonly boolean[]): void => {
    const failedIds = rowIds.filter((_rowId, position) => went[position] !== true);
    if (failedIds.length === 0) {
      toast.success(t('bulkUndone'));
      return;
    }
    browserLogger.warn({ failedIds }, 'Some rows of a bulk change could not be undone');
    toast.error(t('bulkUndoPartial', { count: failedIds.length, total: rowIds.length }));
  };

  const writeProperty = async (rowId: string, propertyKey: string, value: PagePropertyValue): Promise<boolean> => {
    const saved = await callAction(() =>
      updatePageRowPropertiesAction({
        pageId: rowId,
        propertyValues: { [propertyKey]: value },
        spaceId,
      }),
    );
    return !hasActionError(saved);
  };

  const undoProperty = (rowIds: readonly string[], propertyKey: string): void => {
    startWorking(async () => {
      const went = await runWithProgress(rowIds, (rowId) =>
        writeProperty(rowId, propertyKey, valuesByRow[rowId]?.[propertyKey] ?? null),
      );
      reportUndo(rowIds, went);
    });
  };

  const undoDuplicates = (copyIds: readonly string[]): void => {
    startWorking(async () => {
      const went = await runWithProgress(
        copyIds,
        async (pageId) => !hasActionError(await callAction(() => trashPageAction({ pageId, spaceId }))),
      );
      reportUndo(copyIds, went);
    });
  };

  const undoTrash = (rowIds: readonly string[]): void => {
    startWorking(async () => {
      const went = await runWithProgress(
        rowIds,
        async (pageId) => !hasActionError(await callAction(() => restorePageAction({ pageId, spaceId }))),
      );
      reportUndo(rowIds, went);
    });
  };

  const reportPartial = (asked: number, went: number): void => {
    if (went < asked) toast.error(t('bulkPartial', { count: asked - went, total: asked }));
  };

  return {
    duplicateRows: (rowIds: readonly string[]) =>
      startWorking(async () => {
        const copies = await runWithProgress(rowIds, async (pageId) => {
          const copy = await callAction(() => duplicatePageAction({ pageId, spaceId, title: '' }));
          return isActionSuccess<PageSummary>(copy) ? copy.data.id : null;
        });
        const made = copies.filter((id) => id !== null);
        if (made.length === 0) {
          toast.error(tErrors('generic'));
          return;
        }
        onDone();
        toast.success(t('bulkDuplicated', { count: made.length }), {
          action: { label: t('bulkUndo'), onClick: () => undoDuplicates(made) },
          duration: PAGE_BULK_UNDO_DURATION,
        });
        reportPartial(rowIds.length, made.length);
      }),
    isWorking,
    setPropertyOnRows: (rowIds: readonly string[], propertyKey: string, value: PagePropertyValue) =>
      startWorking(async () => {
        const written = await runWithProgress(rowIds, (rowId) => writeProperty(rowId, propertyKey, value));
        const changedIds = rowIds.filter((_rowId, position) => written[position] === true);
        if (changedIds.length === 0) {
          toast.error(tErrors('generic'));
          return;
        }
        onDone();
        toast.success(t('bulkAssigned', { count: changedIds.length }), {
          action: { label: t('bulkUndo'), onClick: () => undoProperty(changedIds, propertyKey) },
          duration: PAGE_BULK_UNDO_DURATION,
        });
        reportPartial(rowIds.length, changedIds.length);
      }),
    trashRows: (rowIds: readonly string[]) =>
      startWorking(async () => {
        const went = await runWithProgress(
          rowIds,
          async (pageId) => !hasActionError(await callAction(() => trashPageAction({ pageId, spaceId }))),
        );
        // Counted and undone only for rows that really went; restoring one that never left would be a no-op.
        const trashed = rowIds.filter((_rowId, position) => went[position] === true);
        if (trashed.length === 0) {
          toast.error(tErrors('generic'));
          return;
        }
        onDone();
        toast.success(t('bulkTrashed', { count: trashed.length }), {
          action: { label: t('bulkUndo'), onClick: () => undoTrash(trashed) },
          duration: PAGE_BULK_UNDO_DURATION,
        });
        reportPartial(rowIds.length, trashed.length);
      }),
  };
};
