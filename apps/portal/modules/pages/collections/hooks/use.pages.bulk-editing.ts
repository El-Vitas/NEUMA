'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { hasActionError, isActionSuccess } from '@/shared/lib/action-result';
import { duplicatePageAction, restorePageAction, trashPageAction } from '../../server/actions/pages.actions';
import type { PageSummary } from '../../types/pages.types';
import { PAGE_BULK_UNDO_DURATION } from '../constants/pages.row-context.constants';
import { updatePageRowPropertiesAction } from '../server/actions/pages.collections.actions';
import type { PagesBulkEditing } from '../types/pages.bulk-editing.types';
import type { PagePropertyValue, PagePropertyValues } from '../types/pages.schema.types';

/**
 * Hacer de una vez lo mismo con varias filas.
 *
 * Cada fila viaja por su cuenta y no en un solo mandado, porque el servidor
 * responde por una fila cada vez: lo que cambia aquí es que no haya que repetir
 * el gesto veinte veces, no cómo se guarda.
 *
 * Todo lo que se hace se puede deshacer desde el aviso que aparece al terminar,
 * y por eso cada operación se apunta lo que hacía falta para volver: qué decía
 * cada fila antes, o cuáles son las copias recién hechas. Sin eso, «deshacer»
 * sería un botón que no puede cumplir.
 */
export const usePagesBulkEditing = (
  spaceId: string,
  /** Lo que cada fila responde ahora, para saber a qué volver si se deshace. */
  valuesByRow: Readonly<Record<string, PagePropertyValues>>,
  onDone: () => void,
): PagesBulkEditing => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const [isWorking, startWorking] = useTransition();

  const writeProperty = async (rowId: string, propertyKey: string, value: PagePropertyValue): Promise<boolean> => {
    const saved = await updatePageRowPropertiesAction({
      pageId: rowId,
      propertyValues: { [propertyKey]: value },
      spaceId,
    });
    return !hasActionError(saved);
  };

  const undoProperty = (rowIds: readonly string[], propertyKey: string): void => {
    startWorking(async () => {
      await Promise.all(
        rowIds.map((rowId) => writeProperty(rowId, propertyKey, valuesByRow[rowId]?.[propertyKey] ?? null)),
      );
      toast.success(t('bulkUndone'));
    });
  };

  const undoDuplicates = (copyIds: readonly string[]): void => {
    startWorking(async () => {
      await Promise.all(copyIds.map((pageId) => trashPageAction({ pageId, spaceId })));
      toast.success(t('bulkUndone'));
    });
  };

  const undoTrash = (rowIds: readonly string[]): void => {
    startWorking(async () => {
      await Promise.all(rowIds.map((pageId) => restorePageAction({ pageId, spaceId })));
      toast.success(t('bulkUndone'));
    });
  };

  return {
    duplicateRows: (rowIds: readonly string[]) =>
      startWorking(async () => {
        const copies = await Promise.all(
          rowIds.map(async (pageId) => {
            const copy = await duplicatePageAction({ pageId, spaceId, title: '' });
            return isActionSuccess<PageSummary>(copy) ? copy.data.id : null;
          }),
        );
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
      }),
    isWorking,
    setPropertyOnRows: (rowIds: readonly string[], propertyKey: string, value: PagePropertyValue) =>
      startWorking(async () => {
        const written = await Promise.all(rowIds.map((rowId) => writeProperty(rowId, propertyKey, value)));
        if (!written.some(Boolean)) {
          toast.error(tErrors('generic'));
          return;
        }
        onDone();
        toast.success(t('bulkAssigned', { count: written.filter(Boolean).length }), {
          action: { label: t('bulkUndo'), onClick: () => undoProperty(rowIds, propertyKey) },
          duration: PAGE_BULK_UNDO_DURATION,
        });
      }),
    trashRows: (rowIds: readonly string[]) =>
      startWorking(async () => {
        const sent = await Promise.all(
          rowIds.map(async (pageId) => ({ pageId, went: !hasActionError(await trashPageAction({ pageId, spaceId })) })),
        );
        /* Se cuenta y se deshace sobre las que de verdad se fueron: devolver una fila que sigue en su sitio no es deshacer nada. */
        const trashed = sent.filter((one) => one.went).map((one) => one.pageId);
        if (trashed.length === 0) {
          toast.error(tErrors('generic'));
          return;
        }
        onDone();
        toast.success(t('bulkTrashed', { count: trashed.length }), {
          action: { label: t('bulkUndo'), onClick: () => undoTrash(trashed) },
          duration: PAGE_BULK_UNDO_DURATION,
        });
      }),
  };
};
