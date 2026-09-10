import type {
  PageFilter,
  PageFilterCondition,
  PageFilterGroupOperator,
  PageFilterOperator,
  PagePropertyValue,
  PageSort,
} from '@company-brain/shared';
import {
  getPageFilterOperators,
  getPagePropertyLogicalType,
  PAGE_FILTER_GROUP_OPERATOR,
  PAGE_SORT_DIRECTION,
  readPageViewConfiguration,
} from '@company-brain/shared';
import { PAGE_FILTER_OPERATORS_WITHOUT_VALUE } from '../constants/pages.view-filtering.constants';
import type { PageSchemaProperty, PageSchemaView } from '../types/pages.schema.types';

export const filterOperatorNeedsValue = (operator: PageFilterOperator): boolean =>
  !PAGE_FILTER_OPERATORS_WITHOUT_VALUE.includes(operator);

export const listFilterOperatorsFor = (property: PageSchemaProperty): readonly PageFilterOperator[] =>
  getPageFilterOperators(getPagePropertyLogicalType(property.type));

/**
 * Las condiciones de una vista, siempre como lista.
 *
 * Lo guardado puede ser un grupo o una condición suelta —el contrato admite
 * ambos—, y quien las muestra no debería tener que distinguirlo.
 */
export const readViewFilterConditions = (view: PageSchemaView): readonly PageFilterCondition[] => {
  const { filter } = readPageViewConfiguration(view.configuration);
  if (filter === null) return [];
  if (filter.kind === 'CONDITION') return [filter];
  return filter.conditions.filter((condition): condition is PageFilterCondition => condition.kind === 'CONDITION');
};

export const readViewFilterOperator = (view: PageSchemaView): PageFilterGroupOperator => {
  const { filter } = readPageViewConfiguration(view.configuration);
  return filter !== null && filter.kind === 'GROUP' ? filter.operator : PAGE_FILTER_GROUP_OPERATOR.AND;
};

export const readViewSorts = (view: PageSchemaView): readonly PageSort[] =>
  readPageViewConfiguration(view.configuration).sorts;

const toFilter = (conditions: readonly PageFilterCondition[], operator: PageFilterGroupOperator): PageFilter | null =>
  conditions.length === 0 ? null : { conditions, kind: 'GROUP', operator };

const rewriteView = (
  views: readonly PageSchemaView[],
  viewName: string,
  rewrite: (view: PageSchemaView) => PageSchemaView['configuration'],
): readonly PageSchemaView[] =>
  views.map((view) => (view.name === viewName ? { ...view, configuration: rewrite(view) } : view));

const rewriteConditions = (
  views: readonly PageSchemaView[],
  viewName: string,
  rewrite: (conditions: readonly PageFilterCondition[]) => readonly PageFilterCondition[],
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (view) => ({
    ...readPageViewConfiguration(view.configuration),
    filter: toFilter(rewrite(readViewFilterConditions(view)), readViewFilterOperator(view)),
  }));

/**
 * Cómo se reconoce una condición entre las demás.
 *
 * Una condición guardada no lleva identificador —el contrato guarda lo que la
 * condición dice, no cuál es—, así que lo que dice hace de nombre. Por eso no
 * se admiten dos a medio armar sobre la misma propiedad: serían indistinguibles
 * mientras ninguna tenga valor.
 */
export const readFilterConditionKey = (condition: PageFilterCondition): string =>
  `${condition.propertyKey}|${condition.operator}|${condition.value === null ? '' : String(condition.value)}`;

export const addViewFilterCondition = (
  views: readonly PageSchemaView[],
  viewName: string,
  property: PageSchemaProperty,
): readonly PageSchemaView[] =>
  rewriteConditions(views, viewName, (conditions) => {
    const arriving: PageFilterCondition = {
      kind: 'CONDITION',
      operator: listFilterOperatorsFor(property)[0] ?? 'IS',
      propertyKey: property.key,
      value: null,
    };
    const alreadySaid = conditions.some(
      (condition) => readFilterConditionKey(condition) === readFilterConditionKey(arriving),
    );
    return alreadySaid ? conditions : [...conditions, arriving];
  });

const replaceAt = (
  conditions: readonly PageFilterCondition[],
  index: number,
  replace: (condition: PageFilterCondition) => PageFilterCondition,
): readonly PageFilterCondition[] =>
  conditions.map((condition, position) => (position === index ? replace(condition) : condition));

export const setViewFilterConditionOperator = (
  views: readonly PageSchemaView[],
  viewName: string,
  index: number,
  operator: PageFilterOperator,
): readonly PageSchemaView[] =>
  rewriteConditions(views, viewName, (conditions) =>
    replaceAt(conditions, index, (condition) => ({
      ...condition,
      operator,
      value: filterOperatorNeedsValue(operator) ? condition.value : null,
    })),
  );

export const setViewFilterConditionValue = (
  views: readonly PageSchemaView[],
  viewName: string,
  index: number,
  value: PagePropertyValue | null,
): readonly PageSchemaView[] =>
  rewriteConditions(views, viewName, (conditions) =>
    replaceAt(conditions, index, (condition) => ({ ...condition, value })),
  );

export const removeViewFilterCondition = (
  views: readonly PageSchemaView[],
  viewName: string,
  index: number,
): readonly PageSchemaView[] =>
  rewriteConditions(views, viewName, (conditions) => conditions.filter((_condition, position) => position !== index));

export const clearViewFilter = (views: readonly PageSchemaView[], viewName: string): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (view) => ({ ...readPageViewConfiguration(view.configuration), filter: null }));

export const setViewFilterOperator = (
  views: readonly PageSchemaView[],
  viewName: string,
  operator: PageFilterGroupOperator,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (view) => ({
    ...readPageViewConfiguration(view.configuration),
    filter: toFilter(readViewFilterConditions(view), operator),
  }));

const rewriteSorts = (
  views: readonly PageSchemaView[],
  viewName: string,
  rewrite: (sorts: readonly PageSort[]) => readonly PageSort[],
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (view) => {
    const current = readPageViewConfiguration(view.configuration);
    return { ...current, sorts: rewrite(current.sorts) };
  });

/** Ordenar dos veces por lo mismo no ordena más, así que la segunda vez no hace nada. */
export const addViewSort = (
  views: readonly PageSchemaView[],
  viewName: string,
  propertyKey: string,
): readonly PageSchemaView[] =>
  rewriteSorts(views, viewName, (sorts) =>
    sorts.some((sort) => sort.propertyKey === propertyKey)
      ? sorts
      : [...sorts, { direction: PAGE_SORT_DIRECTION.ASCENDING, propertyKey }],
  );

export const toggleViewSortDirection = (
  views: readonly PageSchemaView[],
  viewName: string,
  index: number,
): readonly PageSchemaView[] =>
  rewriteSorts(views, viewName, (sorts) =>
    sorts.map((sort, position) =>
      position === index
        ? {
            ...sort,
            direction:
              sort.direction === PAGE_SORT_DIRECTION.ASCENDING
                ? PAGE_SORT_DIRECTION.DESCENDING
                : PAGE_SORT_DIRECTION.ASCENDING,
          }
        : sort,
    ),
  );

export const removeViewSort = (
  views: readonly PageSchemaView[],
  viewName: string,
  index: number,
): readonly PageSchemaView[] =>
  rewriteSorts(views, viewName, (sorts) => sorts.filter((_sort, position) => position !== index));
