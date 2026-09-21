'use client';

import type { PageFilterGroupOperator, PageFilterOperator, PageViewCalculation } from '@company-brain/shared';
import { EMPTY_PAGE_FILTER_GROUP } from '../constants/pages.view-filtering.constants';
import {
  addViewFilterCondition,
  addViewFilterGroup,
  addViewSort,
  clearViewFilter,
  countFilterConditions,
  readViewCalculations,
  readViewFilterRoot,
  readViewSorts,
  removeViewFilterNode,
  removeViewSort,
  setViewCalculation,
  setViewFilterConditionOperator,
  setViewFilterConditionValue,
  setViewFilterGroupOperator,
  toggleViewSortDirection,
} from '../lib/pages.view-filtering.lib';
import type { PagePropertyValue, PageSchema, PageSchemaProperty } from '../types/pages.schema.types';
import type { PageFilterPath, PagesViewFiltering } from '../types/pages.view-filtering.types';
import { usePagesViewSaving } from './use.pages.view-saving';

/**
 * Lo que una vista filtra, ordena y calcula, aplicado en cuanto se dice.
 *
 * Quien escribe un valor lo aplica al salir del campo, para no pedir las filas
 * por cada tecla. El resto —guardar y volver a pedir las filas— es lo mismo que
 * hace cualquier cambio de una vista, y por eso se apoya en quien ya lo sabe.
 */
export const usePagesViewFiltering = (
  schema: PageSchema,
  activeViewName: string,
  spaceId: string,
): PagesViewFiltering => {
  const { apply, isSaving, views } = usePagesViewSaving(schema, activeViewName, spaceId);

  const activeView = views.find((view) => view.name === activeViewName) ?? null;
  const root = activeView === null ? EMPTY_PAGE_FILTER_GROUP : readViewFilterRoot(activeView);

  return {
    addCondition: (path: PageFilterPath, property: PageSchemaProperty) =>
      apply((current) => addViewFilterCondition(current, activeViewName, path, property)),
    addGroup: (path: PageFilterPath) => apply((current) => addViewFilterGroup(current, activeViewName, path)),
    addSort: (propertyKey: string) => apply((current) => addViewSort(current, activeViewName, propertyKey)),
    clearConditions: () => apply((current) => clearViewFilter(current, activeViewName)),
    calculations: activeView === null ? {} : readViewCalculations(activeView),
    conditionCount: countFilterConditions(root),
    isSaving,
    removeNode: (path: PageFilterPath) => apply((current) => removeViewFilterNode(current, activeViewName, path)),
    removeSort: (index: number) => apply((current) => removeViewSort(current, activeViewName, index)),
    root,
    setCalculation: (propertyKey: string, calculation: PageViewCalculation) =>
      apply((current) => setViewCalculation(current, activeViewName, propertyKey, calculation)),
    setConditionOperator: (path: PageFilterPath, operator: PageFilterOperator) =>
      apply((current) => setViewFilterConditionOperator(current, activeViewName, path, operator)),
    setConditionValue: (path: PageFilterPath, value: PagePropertyValue | null) =>
      apply((current) => setViewFilterConditionValue(current, activeViewName, path, value)),
    setGroupOperator: (path: PageFilterPath, operator: PageFilterGroupOperator) =>
      apply((current) => setViewFilterGroupOperator(current, activeViewName, path, operator)),
    sorts: activeView === null ? [] : readViewSorts(activeView),
    toggleSortDirection: (index: number) => apply((current) => toggleViewSortDirection(current, activeViewName, index)),
  };
};
