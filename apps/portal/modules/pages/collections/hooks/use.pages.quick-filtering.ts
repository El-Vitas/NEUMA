'use client';

import type { PageFilter, PageFilterGroupOperator, PageFilterOperator } from '@neuma/shared';
import { useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { buildCollectionViewHref } from '../lib/pages.collection.view-selection.lib';
import { editQuickFilter, readQuickFilterRoot } from '../lib/pages.quick-filtering.lib';
import {
  addViewFilterCondition,
  addViewFilterGroup,
  clearViewFilter,
  countFilterConditions,
  removeViewFilterNode,
  setViewFilterConditionOperator,
  setViewFilterConditionValue,
  setViewFilterGroupOperator,
} from '../lib/pages.view-filtering.lib';
import type { PagePropertyValue, PageSchemaProperty, PageSchemaViewDraft } from '../types/pages.schema.types';
import type { PageFilterPath, PagesFilterEditing } from '../types/pages.view-filtering.types';

/**
 * The filter that sits on top of the view and is not saved in it. It lives in the address, like the words searched, so
 * the server reads the rows, the counts and the next pages with it and a link carries it.
 */
export const usePagesQuickFiltering = (
  activeViewName: string,
  quickFilter: null | PageFilter,
  search: string,
): PagesFilterEditing => {
  const router = useRouter();
  const [isChanging, startChanging] = useTransition();
  const root = readQuickFilterRoot(quickFilter);

  const apply = (
    edit: (views: readonly PageSchemaViewDraft[], viewName: string) => readonly PageSchemaViewDraft[],
  ): void => {
    const edited = editQuickFilter(quickFilter, edit);
    startChanging(() =>
      router.replace(buildCollectionViewHref(activeViewName, { quickFilter: edited, search }), { scroll: false }),
    );
  };

  return {
    addCondition: (path: PageFilterPath, property: PageSchemaProperty) =>
      apply((views, name) => addViewFilterCondition(views, name, path, property)),
    addGroup: (path: PageFilterPath) => apply((views, name) => addViewFilterGroup(views, name, path)),
    clearConditions: () => apply((views, name) => clearViewFilter(views, name)),
    conditionCount: countFilterConditions(root),
    isSaving: isChanging,
    removeNode: (path: PageFilterPath) => apply((views, name) => removeViewFilterNode(views, name, path)),
    root,
    setConditionOperator: (path: PageFilterPath, operator: PageFilterOperator) =>
      apply((views, name) => setViewFilterConditionOperator(views, name, path, operator)),
    setConditionValue: (path: PageFilterPath, value: null | PagePropertyValue) =>
      apply((views, name) => setViewFilterConditionValue(views, name, path, value)),
    setGroupOperator: (path: PageFilterPath, operator: PageFilterGroupOperator) =>
      apply((views, name) => setViewFilterGroupOperator(views, name, path, operator)),
  };
};
