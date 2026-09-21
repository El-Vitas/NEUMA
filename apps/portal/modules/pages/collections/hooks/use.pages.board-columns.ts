'use client';

import type { PageOptionColor } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { hasActionError } from '@/shared/lib/action-result';
import {
  addSchemaOption,
  isSchemaOptionNameTaken,
  moveSchemaOption,
  moveSchemaOptionSideways,
  updateSchemaOptionColor,
} from '../lib/pages.schema-editing.lib';
import {
  readViewCollapsedGroups,
  readViewColumnLimits,
  readViewHidesEmptyGroups,
  readViewHidesUnassignedColumn,
  setViewColumnLimit,
  toggleViewCollapsedGroup,
  toggleViewHidesUnassignedColumn,
} from '../lib/pages.view-filtering.lib';
import { rewritePageCollectionOptionAction } from '../server/actions/pages.collections.actions';
import type { PagesBoardColumns } from '../types/pages.board-columns.types';
import type { PageSchema } from '../types/pages.schema.types';
import { usePagesShapeSaving } from './use.pages.shape-saving';
import { usePagesViewSaving } from './use.pages.view-saving';

/**
 * Mandar sobre las columnas de un tablero, que son los valores de la propiedad
 * por la que agrupa.
 *
 * Se aplica al momento, como arrastrar una tarjeta: una columna se toca
 * mirándola, y guardar aparte lo que se ve obliga a ir a otra pantalla para
 * comprobar lo que ya está delante.
 *
 * Lo que se hace aquí se reparte en tres según a quién pertenece. El nombre y el
 * color son del **valor**, y se ven en todas las vistas. Plegarla, ponerle un
 * tope o esconder la de las filas sin valor son de **la vista**: es cómo se está
 * mirando, no lo que las filas guardan. Y renombrar o quitar arrastran además a
 * las **filas**, así que van por su propio camino: el servidor tiene que saber
 * de qué nombre viene para reescribir lo que guardaron.
 */
export const usePagesBoardColumns = (
  schema: PageSchema,
  groupByKey: string,
  activeViewName: string,
  spaceId: string,
): PagesBoardColumns => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const viewSaving = usePagesViewSaving(schema, activeViewName, spaceId);
  const shape = usePagesShapeSaving(schema, spaceId);
  const [isRewriting, startRewriting] = useTransition();

  const activeView = viewSaving.views.find((view) => view.name === activeViewName) ?? null;

  const afterWriting = (): void => {
    router.refresh();
    toast.success(t('saved'));
  };

  /** Las vistas van tal como están aquí, con lo que todavía no se mandó, para no perderlo por el camino. */
  const saveShape = (properties: PageSchema['properties']): void => shape.save(properties, viewSaving.views);

  const rewrite = (from: string, to: null | string): void => {
    startRewriting(async () => {
      const written = await rewritePageCollectionOptionAction({
        from,
        pageId: schema.pageId,
        propertyKey: groupByKey,
        spaceId,
        to,
      });
      if (hasActionError(written)) {
        toast.error(tErrors('generic'));
        return;
      }
      afterWriting();
    });
  };

  /**
   * Dos columnas con el mismo nombre no pueden ser. Se dice aquí, con el nombre
   * delante, en vez de mandarlo y recibir de vuelta un «algo salió mal» que no
   * señala a nada.
   */
  const refuseTakenName = (name: string): boolean => {
    if (!isSchemaOptionNameTaken(schema.properties, groupByKey, name)) return false;
    toast.error(t('columnNameTaken', { column: name.trim() }));
    return true;
  };

  return {
    addColumn: (name: string) => {
      if (!refuseTakenName(name)) saveShape(addSchemaOption(schema.properties, groupByKey, name));
    },
    collapsedColumns: activeView === null ? [] : readViewCollapsedGroups(activeView),
    hidesEmptyGroups: activeView !== null && readViewHidesEmptyGroups(activeView),
    hidesUnassignedColumn: activeView !== null && readViewHidesUnassignedColumn(activeView),
    isBusy: isRewriting || shape.isSaving || viewSaving.isSaving,
    limits: activeView === null ? {} : readViewColumnLimits(activeView),
    moveColumn: (value: string, beforeValue: null | string) =>
      saveShape(moveSchemaOption(schema.properties, groupByKey, value, beforeValue)),
    moveColumnSideways: (value: string, direction: 'EARLIER' | 'LATER') =>
      saveShape(moveSchemaOptionSideways(schema.properties, groupByKey, value, direction)),
    paintColumn: (value: string, color: PageOptionColor | null) =>
      saveShape(updateSchemaOptionColor(schema.properties, groupByKey, value, color)),
    removeColumn: (value: string) => rewrite(value, null),
    renameColumn: (from: string, to: string) => {
      if (!refuseTakenName(to)) rewrite(from, to);
    },
    setLimit: (value: string, limit: null | number) =>
      viewSaving.apply((current) => setViewColumnLimit(current, activeViewName, value, limit)),
    toggleCollapsed: (value: string) =>
      viewSaving.apply((current) => toggleViewCollapsedGroup(current, activeViewName, value)),
    toggleUnassignedColumn: () =>
      viewSaving.apply((current) => toggleViewHidesUnassignedColumn(current, activeViewName)),
  };
};
