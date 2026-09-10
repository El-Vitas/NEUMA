'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { isActionSuccess } from '@/shared/lib/action-result';
import { createEmptyPageContent } from '../../editor/lib/pages.editor.lib';
import { createPageAction } from '../../server/actions/pages.actions';
import type { PageSummary } from '../../types/pages.types';
import { buildNewRowPropertyValues } from '../lib/pages.board-drag.lib';

/**
 * Crear una fila desde la columna donde va a vivir.
 *
 * Nace ya respondiendo lo que esa columna representa, porque crearla ahí es
 * decirlo: obligar a abrirla después para repetirlo sería pedir dos veces lo
 * mismo.
 *
 * Nace además con su nombre escrito. Una fila es sobre todo su título —es lo
 * que se lee en la tarjeta, en la tabla y en el árbol—, y el propio dominio
 * pide que lo traiga: una fila sin nombre no se distingue de las demás sin
 * nombre.
 */
export const usePagesRowCreation = (
  collectionPageId: string,
  groupByKey: string,
  spaceId: string,
  /** La segunda agrupación, cuando el tablero está en rejilla: una fila nueva nace en su cruce, no solo en su columna. */
  subGroupByKey = '',
): {
  readonly createRowIn: (groupKey: string, title: string, bandKey?: string) => void;
  readonly isCreating: boolean;
} => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [isCreating, startCreating] = useTransition();

  return {
    createRowIn: (groupKey: string, title: string, bandKey = '') =>
      startCreating(async () => {
        const created = await createPageAction({
          content: createEmptyPageContent(),
          parentId: collectionPageId,
          propertyValues: {
            ...buildNewRowPropertyValues(groupByKey, groupKey),
            ...(subGroupByKey === '' ? {} : buildNewRowPropertyValues(subGroupByKey, bandKey)),
          },
          spaceId,
          title: title.trim(),
        });
        if (!isActionSuccess<PageSummary>(created)) {
          toast.error(tErrors('generic'));
          return;
        }
        /** La fila la crea el servidor, así que hay que volver a pedirla para verla aparecer. */
        router.refresh();
        toast.success(t('rowCreated'));
      }),
    isCreating,
  };
};
