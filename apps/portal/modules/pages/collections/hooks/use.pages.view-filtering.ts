'use client';

import type { PageFilterGroupOperator, PageFilterOperator } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { isActionSuccess } from '@/shared/lib/action-result';
import { toSavableView } from '../lib/pages.schema-editing.lib';
import {
  addViewFilterCondition,
  addViewSort,
  clearViewFilter,
  readViewFilterConditions,
  readViewFilterOperator,
  readViewSorts,
  removeViewFilterCondition,
  removeViewSort,
  setViewFilterConditionOperator,
  setViewFilterConditionValue,
  setViewFilterOperator,
  toggleViewSortDirection,
} from '../lib/pages.view-filtering.lib';
import { updatePageCollectionAction } from '../server/actions/pages.collections.actions';
import type { PagePropertyValue, PageSchema, PageSchemaProperty, PageSchemaView } from '../types/pages.schema.types';
import type { PagesViewFiltering } from '../types/pages.view-filtering.types';

/**
 * Lo que una vista filtra y ordena, aplicado en cuanto se dice.
 *
 * A diferencia de la forma de la colección, que se arma en varios pasos y se
 * guarda al final, un filtro se responde mirando las filas: guardarlo al
 * momento es lo que permite ver si dejó lo que se buscaba. Quien escribe un
 * valor lo aplica al salir del campo, para no pedir las filas por cada tecla.
 */
export const usePagesViewFiltering = (
  schema: PageSchema,
  activeViewName: string,
  spaceId: string,
): PagesViewFiltering => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [views, setViews] = useState<readonly PageSchemaView[]>(schema.views);
  const [isSaving, startSaving] = useTransition();

  const activeView = views.find((view) => view.name === activeViewName) ?? null;

  const apply = (rewrite: (current: readonly PageSchemaView[]) => readonly PageSchemaView[]): void => {
    const next = rewrite(views);
    setViews(next);
    startSaving(async () => {
      const saved = await updatePageCollectionAction({
        pageId: schema.pageId,
        properties: schema.properties,
        spaceId,
        views: next.map(toSavableView),
      });
      if (!isActionSuccess<PageSchema>(saved)) {
        setViews(views);
        toast.error(tErrors('generic'));
        return;
      }
      setViews(saved.data.views);
      /**
       * Las filas que la vista deja pasar las cuenta el servidor, y lo ya
       * dibujado no vuelve a pedirse solo: sin esto el filtro queda guardado y
       * en pantalla siguen las mismas filas de antes.
       */
      router.refresh();
      toast.success(t('saved'));
    });
  };

  return {
    addCondition: (property: PageSchemaProperty) =>
      apply((current) => addViewFilterCondition(current, activeViewName, property)),
    addSort: (propertyKey: string) => apply((current) => addViewSort(current, activeViewName, propertyKey)),
    clearConditions: () => apply((current) => clearViewFilter(current, activeViewName)),
    conditions: activeView === null ? [] : readViewFilterConditions(activeView),
    isSaving,
    joinOperator: activeView === null ? 'AND' : readViewFilterOperator(activeView),
    removeCondition: (index: number) => apply((current) => removeViewFilterCondition(current, activeViewName, index)),
    removeSort: (index: number) => apply((current) => removeViewSort(current, activeViewName, index)),
    setConditionOperator: (index: number, operator: PageFilterOperator) =>
      apply((current) => setViewFilterConditionOperator(current, activeViewName, index, operator)),
    setConditionValue: (index: number, value: PagePropertyValue | null) =>
      apply((current) => setViewFilterConditionValue(current, activeViewName, index, value)),
    setJoinOperator: (operator: PageFilterGroupOperator) =>
      apply((current) => setViewFilterOperator(current, activeViewName, operator)),
    sorts: activeView === null ? [] : readViewSorts(activeView),
    toggleSortDirection: (index: number) => apply((current) => toggleViewSortDirection(current, activeViewName, index)),
  };
};
