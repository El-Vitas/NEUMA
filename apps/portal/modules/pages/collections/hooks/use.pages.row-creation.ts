'use client';

import { isTitlePageProperty } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess } from '@/shared/lib/action-result';
import { createEmptyPageContent } from '../../editor/lib/pages.editor.lib';
import { createPageAction } from '../../server/actions/pages.actions';
import type { PageSummary } from '../../types/pages.types';
import { buildNewRowPropertyValues } from '../lib/pages.board-drag.lib';
import { buildRowPropertyValues } from '../lib/pages.properties.lib';
import type { PagesRowCreation, PagesRowCreationInput } from '../types/pages.row-creation.types';

/**
 * Crear una fila desde el sitio donde va a vivir: una columna del tablero, un
 * día del calendario.
 *
 * Nace ya respondiendo lo que ese sitio representa, porque ponerla ahí es
 * decirlo: obligar a abrirla después para repetirlo sería pedir dos veces lo
 * mismo. Y nace además respondiendo lo que la colección da por sentado, porque
 * una colección puede exigir respuesta a cosas que ese sitio no dice, y el
 * servidor rechaza la fila entera por lo que falta.
 *
 * Nace con su nombre escrito. Una fila es sobre todo su título —es lo que se lee
 * en la tarjeta, en la tabla y en el árbol—, y el propio dominio pide que lo
 * traiga: una fila sin nombre no se distingue de las demás sin nombre.
 */
export const usePagesRowCreation = ({
  collectionPageId,
  placedByKey,
  properties,
  spaceId,
  bandedByKey = '',
}: PagesRowCreationInput): PagesRowCreation => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const [isCreating, startCreating] = useTransition();

  return {
    createRowIn: (placedValue: string, title: string, bandValue = '') =>
      startCreating(async () => {
        const created = await createPageAction({
          content: createEmptyPageContent(),
          parentId: collectionPageId,
          propertyValues: {
            /** El título viaja aparte, escrito: no es una respuesta más de la fila. */
            ...buildRowPropertyValues(properties.filter((property) => !isTitlePageProperty(property.type))),
            ...buildNewRowPropertyValues(placedByKey, placedValue),
            ...(bandedByKey === '' ? {} : buildNewRowPropertyValues(bandedByKey, bandValue)),
          },
          spaceId,
          title: title.trim(),
        });
        if (!isActionSuccess<PageSummary>(created)) {
          toast.error(tErrors('generic'));
          return;
        }
        toast.success(t('rowCreated'));
      }),
    isCreating,
  };
};
