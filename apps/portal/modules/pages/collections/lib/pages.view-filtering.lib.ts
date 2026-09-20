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
} from '@company-brain/shared';
import {
  getPageFilterOperators,
  getPagePropertyLogicalType,
  PAGE_COLUMN_ALIGNMENT,
  PAGE_FILTER_GROUP_OPERATOR,
  PAGE_FILTER_MAXIMUM_DEPTH,
  PAGE_FILTER_OPERATOR,
  PAGE_ROW_HEIGHT,
  PAGE_SORT_DIRECTION,
  PAGE_VIEW_CALCULATION,
  PAGE_VIEW_CALCULATION_VALUES,
  readPageViewConfiguration,
} from '@company-brain/shared';
import {
  EMPTY_PAGE_FILTER_GROUP,
  PAGE_FILTER_OPERATORS_WITHOUT_VALUE,
  PAGE_NESTED_FILTER_GROUP_LEVELS,
} from '../constants/pages.view-filtering.constants';
import type { PageSchemaProperty, PageSchemaView } from '../types/pages.schema.types';
import type { PageFilterPath } from '../types/pages.view-filtering.types';

export const filterOperatorNeedsValue = (operator: PageFilterOperator): boolean =>
  !PAGE_FILTER_OPERATORS_WITHOUT_VALUE.includes(operator);

export const listFilterOperatorsFor = (property: PageSchemaProperty): readonly PageFilterOperator[] =>
  getPageFilterOperators(getPagePropertyLogicalType(property.type));

/**
 * Cómo compara lo elegido, entre lo que esa propiedad admite.
 *
 * Lo elegido en un desplegable llega como texto, así que se busca en la lista
 * en vez de darlo por bueno: un operador que esa clase de propiedad no admite
 * no llega a escribirse en la condición.
 */
export const readFilterOperatorFor = (property: PageSchemaProperty, chosen: string): PageFilterOperator => {
  const operators = listFilterOperatorsFor(property);
  return operators.find((candidate) => candidate === chosen) ?? operators[0] ?? PAGE_FILTER_OPERATOR.IS;
};

/**
 * Lo que una vista deja pasar, siempre como el grupo que es.
 *
 * Lo guardado puede ser un grupo o una condición suelta —el contrato admite
 * ambos—, y quien lo muestra no debería tener que distinguirlo: una condición
 * sola se lee como el grupo de una condición.
 */
const readFilterRootOf = ({ filter }: PageViewConfiguration): PageFilterGroup => {
  if (filter === null) return EMPTY_PAGE_FILTER_GROUP;
  if (filter.kind === 'GROUP') return filter;
  return { conditions: [filter], kind: 'GROUP', operator: PAGE_FILTER_GROUP_OPERATOR.AND };
};

export const readViewFilterRoot = (view: PageSchemaView): PageFilterGroup =>
  readFilterRootOf(readPageViewConfiguration(view.configuration));

/** Cuántas condiciones hay puestas en total, estén sueltas o dentro de un grupo. */
export const countFilterConditions = (filter: PageFilter): number =>
  filter.kind === 'CONDITION'
    ? 1
    : filter.conditions.reduce((total, nested) => total + countFilterConditions(nested), 0);

/**
 * Si dentro de este grupo cabe otro.
 *
 * El contrato admite tres niveles contando la condición, así que un grupo
 * abierto dentro de otro dejaría a sus condiciones en el cuarto. Solo el grupo
 * de arriba puede abrir grupos.
 */
export const canNestFilterGroup = (path: PageFilterPath): boolean =>
  path.length + 1 + PAGE_NESTED_FILTER_GROUP_LEVELS <= PAGE_FILTER_MAXIMUM_DEPTH;

/** Cómo se nombra un nodo entre los demás: dónde está, que es lo único que no comparte con ningún otro. */
export const readFilterNodeKey = (path: PageFilterPath): string => path.join('.');

export const readViewSorts = (view: PageSchemaView): readonly PageSort[] =>
  readPageViewConfiguration(view.configuration).sorts;

/** Un filtro sin ninguna condición es una vista que no filtra, y eso se guarda como nada. */
const toFilter = (root: PageFilterGroup): PageFilter | null => (countFilterConditions(root) === 0 ? null : root);

/**
 * Lo que una vista dice de sí misma, cambiado en un sitio.
 *
 * A quien lo cambia le llega ya leído y no en crudo: lo guardado admite claves
 * que el contrato no conoce —una vista escrita por una versión más nueva—, y
 * devolverlas tal cual haría que el servidor rechazara el cambio entero.
 */
const rewriteView = (
  views: readonly PageSchemaView[],
  viewName: string,
  rewrite: (configuration: PageViewConfiguration) => PageViewConfiguration,
): readonly PageSchemaView[] =>
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
  views: readonly PageSchemaView[],
  viewName: string,
  rewrite: (root: PageFilterGroup) => PageFilterGroup,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...configuration,
    filter: toFilter(rewrite(readFilterRootOf(configuration))),
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
  path: PageFilterPath,
  property: PageSchemaProperty,
): readonly PageSchemaView[] =>
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

/**
 * Abre un grupo dentro de otro, para decir «esto y además una de estas otras».
 *
 * Nace uniendo con «o» porque es lo que no se podía decir sin él: quien abre un
 * paréntesis dentro de un «y» está pidiendo justo lo que el «y» no da.
 */
export const addViewFilterGroup = (
  views: readonly PageSchemaView[],
  viewName: string,
  path: PageFilterPath,
): readonly PageSchemaView[] => {
  if (!canNestFilterGroup(path)) return views;
  return rewriteFilter(views, viewName, (root) =>
    rewriteGroupAt(root, path, (group) => ({
      ...group,
      conditions: [...group.conditions, { conditions: [], kind: 'GROUP', operator: PAGE_FILTER_GROUP_OPERATOR.OR }],
    })),
  );
};

const rewriteConditionAt = (
  views: readonly PageSchemaView[],
  viewName: string,
  path: PageFilterPath,
  rewrite: (condition: PageFilterCondition) => PageFilterCondition,
): readonly PageSchemaView[] =>
  rewriteFilter(views, viewName, (root) =>
    rewriteChildAt(root, path, (node) => (node.kind === 'CONDITION' ? rewrite(node) : node)),
  );

export const setViewFilterConditionOperator = (
  views: readonly PageSchemaView[],
  viewName: string,
  path: PageFilterPath,
  operator: PageFilterOperator,
): readonly PageSchemaView[] =>
  rewriteConditionAt(views, viewName, path, (condition) => ({
    ...condition,
    operator,
    value: filterOperatorNeedsValue(operator) ? condition.value : null,
  }));

export const setViewFilterConditionValue = (
  views: readonly PageSchemaView[],
  viewName: string,
  path: PageFilterPath,
  value: PagePropertyValue | null,
): readonly PageSchemaView[] => rewriteConditionAt(views, viewName, path, (condition) => ({ ...condition, value }));

/** Quita lo que haya en ese sitio: una condición, o un grupo con todo lo que lleva dentro. */
export const removeViewFilterNode = (
  views: readonly PageSchemaView[],
  viewName: string,
  path: PageFilterPath,
): readonly PageSchemaView[] => rewriteFilter(views, viewName, (root) => rewriteChildAt(root, path, () => null));

export const clearViewFilter = (views: readonly PageSchemaView[], viewName: string): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({ ...configuration, filter: null }));

export const setViewFilterGroupOperator = (
  views: readonly PageSchemaView[],
  viewName: string,
  path: PageFilterPath,
  operator: PageFilterGroupOperator,
): readonly PageSchemaView[] =>
  rewriteFilter(views, viewName, (root) => rewriteGroupAt(root, path, (group) => ({ ...group, operator })));

const rewriteSorts = (
  views: readonly PageSchemaView[],
  viewName: string,
  rewrite: (sorts: readonly PageSort[]) => readonly PageSort[],
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({ ...configuration, sorts: rewrite(configuration.sorts) }));

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

export const readViewCollapsedGroups = (view: PageSchemaView): readonly string[] =>
  readPageViewConfiguration(view.configuration).collapsedGroups;

export const readViewColumnLimits = (view: PageSchemaView): Readonly<Record<string, number>> =>
  readPageViewConfiguration(view.configuration).columnLimits;

export const readViewHidesUnassignedColumn = (view: PageSchemaView): boolean =>
  readPageViewConfiguration(view.configuration).hidesUnassignedColumn;

export const readViewHidesEmptyGroups = (view: PageSchemaView): boolean =>
  readPageViewConfiguration(view.configuration).hidesEmptyGroups;

/**
 * Dejar de ver los grupos que no tienen ninguna fila, o volver a verlos.
 *
 * Es de la vista y no de la propiedad: el valor sigue existiendo y se puede
 * elegir, lo que se pidió fue no tener delante los que nadie eligió todavía.
 */
export const toggleViewHidesEmptyGroups = (
  views: readonly PageSchemaView[],
  viewName: string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...configuration,
    hidesEmptyGroups: !configuration.hidesEmptyGroups,
  }));

/**
 * Plegar un grupo, o desplegarlo: lo mismo dicho al revés, y por eso un solo
 * gesto. Vale igual para una columna del tablero que para una franja de una
 * tabla agrupada, porque son el mismo grupo mirado de otra manera.
 */
export const toggleViewCollapsedGroup = (
  views: readonly PageSchemaView[],
  viewName: string,
  groupKey: string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...configuration,
    collapsedGroups: configuration.collapsedGroups.includes(groupKey)
      ? configuration.collapsedGroups.filter((candidate) => candidate !== groupKey)
      : [...configuration.collapsedGroups, groupKey],
  }));

/**
 * Cuántas tarjetas se espera en una columna, o ninguna espera.
 *
 * «Ninguna espera» se guarda quitando la clave: una columna sin tope no es una
 * columna con tope cero, que sería una columna donde nada cabe.
 */
export const setViewColumnLimit = (
  views: readonly PageSchemaView[],
  viewName: string,
  columnValue: string,
  limit: null | number,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => {
    const { [columnValue]: _replaced, ...rest } = configuration.columnLimits;
    return { ...configuration, columnLimits: limit === null ? rest : { ...rest, [columnValue]: limit } };
  });

export const toggleViewHidesUnassignedColumn = (
  views: readonly PageSchemaView[],
  viewName: string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...configuration,
    hidesUnassignedColumn: !configuration.hidesUnassignedColumn,
  }));

export const readViewColumnWidths = (view: PageSchemaView): Readonly<Record<string, number>> =>
  readPageViewConfiguration(view.configuration).columnWidths;

export const readViewFrozenColumns = (view: PageSchemaView): number =>
  readPageViewConfiguration(view.configuration).frozenColumns;

export const setViewColumnWidth = (
  views: readonly PageSchemaView[],
  viewName: string,
  propertyKey: string,
  width: number,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...configuration,
    columnWidths: { ...configuration.columnWidths, [propertyKey]: width },
  }));

export const setViewFrozenColumns = (
  views: readonly PageSchemaView[],
  viewName: string,
  count: number,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({ ...configuration, frozenColumns: Math.max(count, 0) }));

export const readViewRowHeight = (view: PageSchemaView): PageRowHeight =>
  readPageViewConfiguration(view.configuration).rowHeight;

export const setViewRowHeight = (
  views: readonly PageSchemaView[],
  viewName: string,
  rowHeight: PageRowHeight,
): readonly PageSchemaView[] => rewriteView(views, viewName, (configuration) => ({ ...configuration, rowHeight }));

export const readViewWrapsText = (view: PageSchemaView): boolean =>
  readPageViewConfiguration(view.configuration).wrapsText;

/**
 * Que el texto largo se parta en varias líneas, o que se corte.
 *
 * Partir sin crecer el alto no serviría de nada —las líneas de más quedarían
 * fuera de la fila—, así que empezar a partir sube el alto a medio cuando
 * estaba en el más corto. Dejar de partir no lo baja: quien lo subió puede
 * quererlo alto igual.
 */
export const toggleViewWrapsText = (views: readonly PageSchemaView[], viewName: string): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => {
    const wrapsText = !configuration.wrapsText;
    const grows = wrapsText && configuration.rowHeight === PAGE_ROW_HEIGHT.SHORT;
    return { ...configuration, wrapsText, ...(grows ? { rowHeight: PAGE_ROW_HEIGHT.MEDIUM } : {}) };
  });

export const readViewColumnAlignments = (view: PageSchemaView): Readonly<Record<string, PageColumnAlignment>> =>
  readPageViewConfiguration(view.configuration).columnAlignments;

/** Hacia qué lado se pega una columna. Al principio es lo mismo que no decir nada, y por eso se quita. */
export const setViewColumnAlignment = (
  views: readonly PageSchemaView[],
  viewName: string,
  columnKey: string,
  alignment: PageColumnAlignment,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => {
    const { [columnKey]: _replaced, ...rest } = configuration.columnAlignments;
    return {
      ...configuration,
      columnAlignments: alignment === PAGE_COLUMN_ALIGNMENT.START ? rest : { ...rest, [columnKey]: alignment },
    };
  });

/**
 * Cambia una columna de sitio en la tabla, poniéndola justo antes de otra.
 *
 * El orden de las columnas es el de las propiedades que la vista dice mostrar,
 * así que moverlas es reescribir esa lista. Una vista que nunca eligió nada no
 * tiene lista: se le escribe entera tal como se está viendo, que es lo que
 * estaba enseñando, y recién ahí se mueve una.
 */
export const moveViewProperty = (
  views: readonly PageSchemaView[],
  viewName: string,
  shownKeys: readonly string[],
  propertyKey: string,
  beforeKey: null | string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => {
    const chosen = configuration.visibleProperties ?? shownKeys;
    if (propertyKey === beforeKey || !chosen.includes(propertyKey)) return configuration;
    const rest = chosen.filter((key) => key !== propertyKey);
    const at = beforeKey === null ? rest.length : rest.indexOf(beforeKey);
    if (at === -1) return configuration;
    return { ...configuration, visibleProperties: [...rest.slice(0, at), propertyKey, ...rest.slice(at)] };
  });

/** Un puesto a un lado o al otro, que es como se mueve una columna sin ratón. */
export const moveViewPropertySideways = (
  views: readonly PageSchemaView[],
  viewName: string,
  shownKeys: readonly string[],
  propertyKey: string,
  direction: 'EARLIER' | 'LATER',
): readonly PageSchemaView[] => {
  const from = shownKeys.indexOf(propertyKey);
  const to = direction === 'EARLIER' ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= shownKeys.length) return views;
  const beforeKey = direction === 'EARLIER' ? (shownKeys[to] ?? null) : (shownKeys[to + 1] ?? null);
  return moveViewProperty(views, viewName, shownKeys, propertyKey, beforeKey);
};

/** Lo elegido en un desplegable llega como texto, y solo es un cálculo si es uno de los que hay. */
export const readPageCalculation = (chosen: string): PageViewCalculation | undefined =>
  PAGE_VIEW_CALCULATION_VALUES.find((candidate) => candidate === chosen);

export const readViewCalculations = (view: PageSchemaView): Readonly<Record<string, PageViewCalculation>> =>
  readPageViewConfiguration(view.configuration).calculations;

/**
 * Qué dice una columna al pie, o que no diga nada.
 *
 * «Nada» se guarda quitando la clave y no escribiéndola: una columna que no
 * calcula es una columna de la que la vista no tiene nada que decir, y dejar
 * escrito que no dice nada llena la configuración de silencios.
 */
export const setViewCalculation = (
  views: readonly PageSchemaView[],
  viewName: string,
  propertyKey: string,
  calculation: PageViewCalculation,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => {
    const { [propertyKey]: _replaced, ...rest } = configuration.calculations;
    return {
      ...configuration,
      calculations: calculation === PAGE_VIEW_CALCULATION.NONE ? rest : { ...rest, [propertyKey]: calculation },
    };
  });
