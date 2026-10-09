'use client';

import type { PageOptionColor } from '@neuma/shared';
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
 * Edits apply immediately. Name and color belong to the option value (all views), collapse, limit and the
 * unassigned column belong to the view, and rename/remove also rewrite rows, so they go through the server.
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

  /** Refused locally so the message can name the column instead of a generic server error. */
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
