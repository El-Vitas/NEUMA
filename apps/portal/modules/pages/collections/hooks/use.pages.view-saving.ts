'use client';

import { readPageViewConfiguration } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess } from '@/shared/lib/action-result';
import { updatePageViewConfigurationAction } from '../server/actions/pages.collections.actions';
import type { PageSchema, PageSchemaView } from '../types/pages.schema.types';
import type { PagesViewSaving } from '../types/pages.view-saving.types';

/**
 * Cambiar lo que una vista dice de sí misma, aplicado en cuanto se dice.
 *
 * A diferencia de la forma de la colección, que se arma en varios pasos y se
 * guarda al final, lo de una vista se responde mirando las filas: aplicarlo al
 * momento es lo que permite ver si quedó como se buscaba.
 *
 * Solo viaja esa vista. Mandar la colección entera reescribiría cada propiedad y
 * cada vista para cambiar un filtro, y se llevaría por delante lo que otra
 * persona acabara de cambiar en otra parte de la forma.
 *
 * Se dibuja antes de que el servidor conteste, y si contesta que no, vuelve solo
 * a lo que había. Las filas vuelven con la respuesta —cuáles pasan y en qué
 * orden lo decide el servidor—: la acción invalida lo guardado y contesta con la
 * página ya rehecha, así que pedir además un redibujado era hacer ese trabajo
 * dos veces por gesto.
 */
export const usePagesViewSaving = (schema: PageSchema, activeViewName: string, spaceId: string): PagesViewSaving => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const [views, setViews] = useState<readonly PageSchemaView[]>(schema.views);
  const [isSaving, startSaving] = useTransition();

  const apply = (rewrite: (current: readonly PageSchemaView[]) => readonly PageSchemaView[]): void => {
    const next = rewrite(views);
    const changed = next.find((view) => view.name === activeViewName);
    if (changed === undefined) return;
    setViews(next);
    startSaving(async () => {
      const saved = await updatePageViewConfigurationAction({
        configuration: { ...readPageViewConfiguration(changed.configuration) },
        pageId: schema.pageId,
        spaceId,
        viewName: activeViewName,
      });
      if (!isActionSuccess<PageSchema>(saved)) {
        setViews(views);
        toast.error(tErrors('generic'));
        return;
      }
      setViews(saved.data.views);
      toast.success(t('saved'));
    });
  };

  return { apply, isSaving, views };
};
