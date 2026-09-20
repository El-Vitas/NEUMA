'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess } from '@/shared/lib/action-result';
import { toSavableView } from '../lib/pages.schema-editing.lib';
import { updatePageCollectionAction } from '../server/actions/pages.collections.actions';
import type { PageSchema, PageSchemaProperty, PageSchemaView } from '../types/pages.schema.types';
import type { PagesShapeSaving } from '../types/pages.shape-saving.types';

/**
 * Mandar la forma de la colección tal como quedó.
 *
 * Lo usa quien cambia algo que es del **valor** y no de la vista —el orden de
 * las opciones, su color, una opción nueva—: eso se ve en todas las vistas, así
 * que viaja con la colección entera y no con la vista que se está mirando.
 *
 * Las vistas se mandan como se le den, no como estén guardadas: quien tiene
 * cambios de vista sin mandar los manda en el mismo viaje en vez de perderlos.
 *
 * No se pide redibujar aparte: la acción invalida lo guardado y vuelve con la
 * página ya rehecha. Pedirlo otra vez era hacer el trabajo entero dos veces —el
 * servidor rehacía la página dos veces por cada gesto— y era la mitad de lo que
 * se tardaba en ver el cambio.
 */
export const usePagesShapeSaving = (schema: PageSchema, spaceId: string): PagesShapeSaving => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const [isSaving, startSaving] = useTransition();

  return {
    isSaving,
    save: (
      properties: readonly PageSchemaProperty[],
      views: readonly PageSchemaView[],
      onSaved?: (saved: PageSchema) => void,
    ) => {
      startSaving(async () => {
        const saved = await updatePageCollectionAction({
          pageId: schema.pageId,
          properties,
          spaceId,
          views: views.map(toSavableView),
        });
        if (!isActionSuccess<PageSchema>(saved)) {
          toast.error(tErrors('generic'));
          return;
        }
        onSaved?.(saved.data);
        toast.success(t('saved'));
      });
    },
  };
};
