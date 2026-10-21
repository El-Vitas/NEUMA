import type {
  PageColumnAlignment,
  PageFilter,
  PageFilterCondition,
  PageFilterGroup,
  PageFilterGroupOperator,
  PageFilterOperator,
  PagePropertyValue,
  PageRowHeight,
  PageSort,
  PageViewCalculation,
  PageViewConfiguration,
} from '@neuma/shared';
import {
  getPageFilterOperators,
  getPagePropertyLogicalType,
  PAGE_COLUMN_ALIGNMENT,
  PAGE_FILTER_GROUP_OPERATOR,
  PAGE_FILTER_MAXIMUM_DEPTH,
  PAGE_FILTER_OPERATOR,
  PAGE_PROPERTY_LOGICAL_TYPE,
  PAGE_ROW_HEIGHT,
  PAGE_SORT_DIRECTION,
  PAGE_VIEW_CALCULATION,
  PAGE_VIEW_CALCULATION_VALUES,
  readPageViewConfiguration,
} from '@neuma/shared';
import {
  EMPTY_PAGE_FILTER_GROUP,
  PAGE_FILTER_OPERATORS_WITHOUT_VALUE,
  PAGE_NESTED_FILTER_GROUP_LEVELS,
} from '../constants/pages.view-filtering.constants';
import type { PageSchemaProperty, PageSchemaViewDraft } from '../types/pages.schema.types';
import type { PageFilterPath } from '../types/pages.view-filtering.types';

export const filterOperatorNeedsValue = (operator: PageFilterOperator): boolean =>
  !PAGE_FILTER_OPERATORS_WITHOUT_VALUE.includes(operator);

/** A relation is filtered by whether it holds anything: naming one of its rows would need a row picker here. */
export const listFilterOperatorsFor = (property: PageSchemaProperty): readonly PageFilterOperator[] => {
  const logicalType = getPagePropertyLogicalType(property.type);
  const operators = getPageFilterOperators(logicalType);
  return logicalType === PAGE_PROPERTY_LOGICAL_TYPE.RELATION
    ? operators.filter((operator) => !filterOperatorNeedsValue(operator))
    : operators;
};

/** Looked up in the allowed list rather than trusted: a select yields plain text. */
export const readFilterOperatorFor = (property: PageSchemaProperty, chosen: string): PageFilterOperator => {
  const operators = listFilterOperatorsFor(property);
  return operators.find((candidate) => candidate === chosen) ?? operators[0] ?? PAGE_FILTER_OPERATOR.IS;
};

/** The stored filter may be a group or a bare condition; a bare one is wrapped in a single-condition group. */
const readFilterRootOf = ({ filter }: PageViewConfiguration): PageFilterGroup => {
  if (filter === null) return EMPTY_PAGE_FILTER_GROUP;
  if (filter.kind === 'GROUP') return filter;
  return { conditions: [filter], kind: 'GROUP', operator: PAGE_FILTER_GROUP_OPERATOR.AND };
};

export const readViewFilterRoot = (view: PageSchemaViewDraft): PageFilterGroup =>
  readFilterRootOf(readPageViewConfiguration(view.configuration));

export const countFilterConditions = (filter: PageFilter): number =>
  filter.kind === 'CONDITION'
    ? 1
    : filter.conditions.reduce((total, nested) => total + countFilterConditions(nested), 0);

/** The contract allows three levels counting the condition, so only the top group can open a nested group. */
export const canNestFilterGroup = (path: PageFilterPath): boolean =>
  path.length + 1 + PAGE_NESTED_FILTER_GROUP_LEVELS <= PAGE_FILTER_MAXIMUM_DEPTH;

export const readFilterNodeKey = (path: PageFilterPath): string => path.join('.');

export const readViewSorts = (view: PageSchemaViewDraft): readonly PageSort[] =>
  readPageViewConfiguration(view.configuration).sorts;

/** A filter with no conditions is stored as null. */
const toFilter = (root: PageFilterGroup): PageFilter | null => (countFilterConditions(root) === 0 ? null : root);

/** Receives the parsed configuration: stored keys unknown to the contract would make the server reject it. */
const rewriteView = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  rewrite: (configuration: PageViewConfiguration) => PageViewConfiguration,
): readonly PageSchemaViewDraft[] =>
  views.map((view) =>
    view.name === viewName
      ? { ...view, configuration: { ...rewrite(readPageViewConfiguration(view.configuration)) } }
      : view,
  );

const rewriteChildAt = (
  group: PageFilterGroup,
  path: PageFilterPath,
  rewrite: (node: PageFilter) => null | PageFilter,
): PageFilterGroup => {
  const [index, ...rest] = path;
  if (index === undefined) return group;
  return {
    ...group,
    conditions: group.conditions.flatMap((node, position) => {
      if (position !== index) return [node];
      if (rest.length > 0) return node.kind === 'GROUP' ? [rewriteChildAt(node, rest, rewrite)] : [node];
      const rewritten = rewrite(node);
      return rewritten === null ? [] : [rewritten];
    }),
  };
};

const rewriteGroupAt = (
  group: PageFilterGroup,
  path: PageFilterPath,
  rewrite: (group: PageFilterGroup) => PageFilterGroup,
): PageFilterGroup =>
  path.length === 0
    ? rewrite(group)
    : rewriteChildAt(group, path, (node) => (node.kind === 'GROUP' ? rewrite(node) : node));

const rewriteFilter = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  rewrite: (root: PageFilterGroup) => PageFilterGroup,
): readonly PageSchemaViewDraft[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...configuration,
    filter: toFilter(rewrite(readFilterRootOf(configuration))),
  }));

/** Conditions have no id, so their content is the identity; two unfinished ones on a property would clash. */
export const readFilterConditionKey = (condition: PageFilterCondition): string =>
  `${condition.propertyKey}|${condition.operator}|${condition.value === null ? '' : String(condition.value)}`;

export const addViewFilterCondition = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  path: PageFilterPath,
  property: PageSchemaProperty,
): readonly PageSchemaViewDraft[] =>
  rewriteFilter(views, viewName, (root) =>
    rewriteGroupAt(root, path, (group) => {
      const arriving: PageFilterCondition = {
        kind: 'CONDITION',
        operator: listFilterOperatorsFor(property)[0] ?? 'IS',
        propertyKey: property.key,
        value: null,
      };
      const alreadySaid = group.conditions.some(
        (node) => node.kind === 'CONDITION' && readFilterConditionKey(node) === readFilterConditionKey(arriving),
      );
      return alreadySaid ? group : { ...group, conditions: [...group.conditions, arriving] };
    }),
  );

/** Starts as OR: nesting inside an AND is only useful for what AND cannot express. */
export const addViewFilterGroup = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  path: PageFilterPath,
): readonly PageSchemaViewDraft[] => {
  if (!canNestFilterGroup(path)) return views;
  return rewriteFilter(views, viewName, (root) =>
    rewriteGroupAt(root, path, (group) => ({
      ...group,
      conditions: [...group.conditions, { conditions: [], kind: 'GROUP', operator: PAGE_FILTER_GROUP_OPERATOR.OR }],
    })),
  );
};

const rewriteConditionAt = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  path: PageFilterPath,
  rewrite: (condition: PageFilterCondition) => PageFilterCondition,
): readonly PageSchemaViewDraft[] =>
  rewriteFilter(views, viewName, (root) =>
    rewriteChildAt(root, path, (node) => (node.kind === 'CONDITION' ? rewrite(node) : node)),
  );

export const setViewFilterConditionOperator = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  path: PageFilterPath,
  operator: PageFilterOperator,
): readonly PageSchemaViewDraft[] =>
  rewriteConditionAt(views, viewName, path, (condition) => ({
    ...condition,
    operator,
    value: filterOperatorNeedsValue(operator) ? condition.value : null,
  }));

export const setViewFilterConditionValue = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  path: PageFilterPath,
  value: PagePropertyValue | null,
): readonly PageSchemaViewDraft[] =>
  rewriteConditionAt(views, viewName, path, (condition) => ({ ...condition, value }));

export const removeViewFilterNode = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  path: PageFilterPath,
): readonly PageSchemaViewDraft[] => rewriteFilter(views, viewName, (root) => rewriteChildAt(root, path, () => null));

export const clearViewFilter = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
): readonly PageSchemaViewDraft[] =>
  rewriteView(views, viewName, (configuration) => ({ ...configuration, filter: null }));

export const setViewFilterGroupOperator = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  path: PageFilterPath,
  operator: PageFilterGroupOperator,
): readonly PageSchemaViewDraft[] =>
  rewriteFilter(views, viewName, (root) => rewriteGroupAt(root, path, (group) => ({ ...group, operator })));

const rewriteSorts = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  rewrite: (sorts: readonly PageSort[]) => readonly PageSort[],
): readonly PageSchemaViewDraft[] =>
  rewriteView(views, viewName, (configuration) => ({ ...configuration, sorts: rewrite(configuration.sorts) }));

/** Sorting twice by the same property is a no-op. */
export const addViewSort = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  propertyKey: string,
): readonly PageSchemaViewDraft[] =>
  rewriteSorts(views, viewName, (sorts) =>
    sorts.some((sort) => sort.propertyKey === propertyKey)
      ? sorts
      : [...sorts, { direction: PAGE_SORT_DIRECTION.ASCENDING, propertyKey }],
  );

export const toggleViewSortDirection = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  index: number,
): readonly PageSchemaViewDraft[] =>
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
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  index: number,
): readonly PageSchemaViewDraft[] =>
  rewriteSorts(views, viewName, (sorts) => sorts.filter((_sort, position) => position !== index));

export const readViewCollapsedGroups = (view: PageSchemaViewDraft): readonly string[] =>
  readPageViewConfiguration(view.configuration).collapsedGroups;

export const readViewColumnLimits = (view: PageSchemaViewDraft): Readonly<Record<string, number>> =>
  readPageViewConfiguration(view.configuration).columnLimits;

export const readViewHidesUnassignedColumn = (view: PageSchemaViewDraft): boolean =>
  readPageViewConfiguration(view.configuration).hidesUnassignedColumn;

export const readViewHidesEmptyGroups = (view: PageSchemaViewDraft): boolean =>
  readPageViewConfiguration(view.configuration).hidesEmptyGroups;

export const toggleViewHidesEmptyGroups = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
): readonly PageSchemaViewDraft[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...configuration,
    hidesEmptyGroups: !configuration.hidesEmptyGroups,
  }));

export const toggleViewCollapsedGroup = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  groupKey: string,
): readonly PageSchemaViewDraft[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...configuration,
    collapsedGroups: configuration.collapsedGroups.includes(groupKey)
      ? configuration.collapsedGroups.filter((candidate) => candidate !== groupKey)
      : [...configuration.collapsedGroups, groupKey],
  }));

/** No limit is stored by removing the key: a limit of zero would mean a column where nothing fits. */
export const setViewColumnLimit = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  columnValue: string,
  limit: null | number,
): readonly PageSchemaViewDraft[] =>
  rewriteView(views, viewName, (configuration) => {
    const { [columnValue]: _replaced, ...rest } = configuration.columnLimits;
    return { ...configuration, columnLimits: limit === null ? rest : { ...rest, [columnValue]: limit } };
  });

export const toggleViewHidesUnassignedColumn = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
): readonly PageSchemaViewDraft[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...configuration,
    hidesUnassignedColumn: !configuration.hidesUnassignedColumn,
  }));

export const readViewColumnWidths = (view: PageSchemaViewDraft): Readonly<Record<string, number>> =>
  readPageViewConfiguration(view.configuration).columnWidths;

export const readViewFrozenColumns = (view: PageSchemaViewDraft): number =>
  readPageViewConfiguration(view.configuration).frozenColumns;

export const setViewColumnWidth = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  propertyKey: string,
  width: number,
): readonly PageSchemaViewDraft[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...configuration,
    columnWidths: { ...configuration.columnWidths, [propertyKey]: width },
  }));

export const setViewFrozenColumns = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  count: number,
): readonly PageSchemaViewDraft[] =>
  rewriteView(views, viewName, (configuration) => ({ ...configuration, frozenColumns: Math.max(count, 0) }));

export const readViewRowHeight = (view: PageSchemaViewDraft): PageRowHeight =>
  readPageViewConfiguration(view.configuration).rowHeight;

export const setViewRowHeight = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  rowHeight: PageRowHeight,
): readonly PageSchemaViewDraft[] => rewriteView(views, viewName, (configuration) => ({ ...configuration, rowHeight }));

export const readViewWrapsText = (view: PageSchemaViewDraft): boolean =>
  readPageViewConfiguration(view.configuration).wrapsText;

/** Enabling wrap raises a SHORT row to MEDIUM (extra lines would be clipped); disabling it never lowers the height. */
export const toggleViewWrapsText = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
): readonly PageSchemaViewDraft[] =>
  rewriteView(views, viewName, (configuration) => {
    const wrapsText = !configuration.wrapsText;
    const grows = wrapsText && configuration.rowHeight === PAGE_ROW_HEIGHT.SHORT;
    return { ...configuration, wrapsText, ...(grows ? { rowHeight: PAGE_ROW_HEIGHT.MEDIUM } : {}) };
  });

export const readViewColumnAlignments = (view: PageSchemaViewDraft): Readonly<Record<string, PageColumnAlignment>> =>
  readPageViewConfiguration(view.configuration).columnAlignments;

/** START is the default, so it is stored by removing the key. */
export const setViewColumnAlignment = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  columnKey: string,
  alignment: PageColumnAlignment,
): readonly PageSchemaViewDraft[] =>
  rewriteView(views, viewName, (configuration) => {
    const { [columnKey]: _replaced, ...rest } = configuration.columnAlignments;
    return {
      ...configuration,
      columnAlignments: alignment === PAGE_COLUMN_ALIGNMENT.START ? rest : { ...rest, [columnKey]: alignment },
    };
  });

/** A view that never chose has no list, so the currently shown keys are written out first and then reordered. */
export const moveViewProperty = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  shownKeys: readonly string[],
  propertyKey: string,
  beforeKey: null | string,
): readonly PageSchemaViewDraft[] =>
  rewriteView(views, viewName, (configuration) => {
    const chosen = configuration.visibleProperties ?? shownKeys;
    if (propertyKey === beforeKey || !chosen.includes(propertyKey)) return configuration;
    const rest = chosen.filter((key) => key !== propertyKey);
    const at = beforeKey === null ? rest.length : rest.indexOf(beforeKey);
    if (at === -1) return configuration;
    return { ...configuration, visibleProperties: [...rest.slice(0, at), propertyKey, ...rest.slice(at)] };
  });

export const moveViewPropertySideways = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  shownKeys: readonly string[],
  propertyKey: string,
  direction: 'EARLIER' | 'LATER',
): readonly PageSchemaViewDraft[] => {
  const from = shownKeys.indexOf(propertyKey);
  const to = direction === 'EARLIER' ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= shownKeys.length) return views;
  const beforeKey = direction === 'EARLIER' ? (shownKeys[to] ?? null) : (shownKeys[to + 1] ?? null);
  return moveViewProperty(views, viewName, shownKeys, propertyKey, beforeKey);
};

export const readPageCalculation = (chosen: string): PageViewCalculation | undefined =>
  PAGE_VIEW_CALCULATION_VALUES.find((candidate) => candidate === chosen);

export const readViewCalculations = (view: PageSchemaViewDraft): Readonly<Record<string, PageViewCalculation>> =>
  readPageViewConfiguration(view.configuration).calculations;

/** NONE is stored by removing the key, so the configuration holds no empty entries. */
export const setViewCalculation = (
  views: readonly PageSchemaViewDraft[],
  viewName: string,
  propertyKey: string,
  calculation: PageViewCalculation,
): readonly PageSchemaViewDraft[] =>
  rewriteView(views, viewName, (configuration) => {
    const { [propertyKey]: _replaced, ...rest } = configuration.calculations;
    return {
      ...configuration,
      calculations: calculation === PAGE_VIEW_CALCULATION.NONE ? rest : { ...rest, [propertyKey]: calculation },
    };
  });
