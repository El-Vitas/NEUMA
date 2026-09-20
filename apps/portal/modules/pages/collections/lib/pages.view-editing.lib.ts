import type { PageChartKind, PageChartMeasure, PageDateBucket, PageViewType } from '@company-brain/shared';
import {
  canPagePropertyGroupBoard,
  PAGE_CHART_KIND,
  PAGE_CHART_KIND_VALUES,
  PAGE_CHART_MEASURE,
  PAGE_CHART_MEASURE_VALUES,
  PAGE_DATE_BUCKET,
  PAGE_DATE_BUCKET_VALUES,
  PAGE_VIEW_OUTCOME_KIND,
  PAGE_VIEW_TYPE_VALUES,
  pageViewRequiresGrouping,
  readPageViewConfiguration,
  readVisiblePropertyKeys,
} from '@company-brain/shared';
import type {
  PageSchemaProperty,
  PageSchemaView,
  PageViewBand,
  PageViewBandedOutcome,
  PageViewFlatOutcome,
  PageViewGroup,
  PageViewGroupedOutcome,
} from '../types/pages.schema.types';

/**
 * La clase de vista que nombra lo elegido en un desplegable, si nombra una que
 * exista. Un desplegable entrega texto suelto, y de ahí a una clase de vista se
 * pasa mirando la lista, no afirmándolo.
 */
export const readPageViewType = (chosen: string): PageViewType | undefined =>
  PAGE_VIEW_TYPE_VALUES.find((candidate) => candidate === chosen);

/** El tramo que nombra lo elegido, y el día cuando lo elegido no nombra ninguno. */
export const readPageDateBucket = (chosen: string): PageDateBucket =>
  PAGE_DATE_BUCKET_VALUES.find((candidate) => candidate === chosen) ?? PAGE_DATE_BUCKET.DAY;

/** Cómo se dibuja lo elegido, y barras cuando lo elegido no nombra ninguna manera. */
export const readPageChartKind = (chosen: string): PageChartKind =>
  PAGE_CHART_KIND_VALUES.find((candidate) => candidate === chosen) ?? PAGE_CHART_KIND.BAR;

/** Qué mide lo elegido, y contar filas cuando lo elegido no nombra ninguna medida. */
export const readPageChartMeasure = (chosen: string): PageChartMeasure =>
  PAGE_CHART_MEASURE_VALUES.find((candidate) => candidate === chosen) ?? PAGE_CHART_MEASURE.COUNT;

/**
 * The properties a board can make columns from.
 *
 * Only a property with a closed list of values: grouping by a date would make a
 * column per day, and grouping by free text a column per answer.
 */
export const listGroupablePropertyKeys = (properties: readonly PageSchemaProperty[]): readonly string[] =>
  properties.filter((property) => canPagePropertyGroupBoard(property.type)).map((property) => property.key);

/**
 * El primer tablero que todavía no dice por dónde agrupa, si lo hay.
 *
 * Un tablero hace una columna por valor, así que sin una propiedad que ofrezca
 * una lista cerrada no tiene columnas que hacer, y el servidor rechaza la
 * colección entera —no solo esa vista—. Se busca aquí para poder decirlo
 * mientras se está configurando, en vez de mandar la forma y que vuelva
 * rechazada con un error que no señala a nadie.
 *
 * Cuenta igual el tablero que apunta a una propiedad que se quitó del esquema o
 * que dejó de ser una selección: quedó señalando a la nada.
 */
export const findBoardWithoutGrouping = (
  views: readonly PageSchemaView[],
  properties: readonly PageSchemaProperty[],
): PageSchemaView | undefined => {
  const groupable = listGroupablePropertyKeys(properties);
  return views.find(
    (view) =>
      pageViewRequiresGrouping(view.type) &&
      !groupable.includes(readPageViewConfiguration(view.configuration).groupBy ?? ''),
  );
};

/**
 * Las filas de un tablero como bandas, vengan como vengan.
 *
 * Un tablero sin segunda agrupación es una rejilla de una sola banda sin
 * nombre: así lo que dibuja columnas lo hace una sola vez, y agregar el
 * subgrupo no obliga a mantener dos tableros que se parecen.
 */
export const readBoardBands = (outcome: PageViewBandedOutcome | PageViewGroupedOutcome): readonly PageViewBand[] =>
  outcome.kind === PAGE_VIEW_OUTCOME_KIND.BANDED_ROWS
    ? outcome.bands
    : [{ color: null, groups: outcome.groups, key: '', label: '' }];

/**
 * Las filas de una vista que lee de las dos maneras, siempre en grupos.
 *
 * A la que nadie pidió agrupar le llegan una tras otra, y aquí se le dan como un
 * único grupo sin nombre: así la tabla —y la lista, y la galería— dibuja de una
 * sola manera, y agrupar deja de ser otra vista para ser la misma con más de un
 * grupo.
 */
export const readViewGroups = (outcome: PageViewFlatOutcome | PageViewGroupedOutcome): readonly PageViewGroup[] =>
  outcome.kind === PAGE_VIEW_OUTCOME_KIND.GROUPED_ROWS
    ? outcome.groups
    : [{ color: null, key: '', label: '', rows: outcome.rows }];

const rewriteView = (
  views: readonly PageSchemaView[],
  viewName: string,
  rewrite: (configuration: PageSchemaView['configuration']) => PageSchemaView['configuration'],
): readonly PageSchemaView[] =>
  views.map((view) => (view.name === viewName ? { ...view, configuration: rewrite(view.configuration) } : view));

/**
 * Por qué propiedad agrupa una vista, o por ninguna.
 *
 * Dejar de agrupar no tiene sentido en un tablero —sus columnas *son* la
 * agrupación—, pero sí en una tabla, que sin ella vuelve a ser una lista de
 * filas. Quitar la agrupación se lleva también las bandas: cruzar lo que ya no
 * está agrupado no significa nada.
 */
export const setViewGroupBy = (
  views: readonly PageSchemaView[],
  viewName: string,
  groupBy: null | string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...readPageViewConfiguration(configuration),
    groupBy,
    ...(groupBy === null ? { subGroupBy: null } : {}),
  }));

/**
 * Por qué segunda propiedad se cruza el tablero, o por ninguna.
 *
 * Nada, y el tablero vuelve a ser columnas y ya. La misma propiedad que hace
 * las columnas no puede hacer también las bandas: sería una rejilla con una
 * sola casilla llena por banda y el resto vacías para siempre.
 */
export const setViewSubGroupBy = (
  views: readonly PageSchemaView[],
  viewName: string,
  subGroupBy: null | string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => {
    const current = readPageViewConfiguration(configuration);
    return { ...current, subGroupBy: subGroupBy === current.groupBy ? null : subGroupBy };
  });

/**
 * En qué tramo caen las filas cuando la vista agrupa por una fecha.
 *
 * No se toca la agrupación: quien agrupaba por «fecha de entrega» sigue
 * haciéndolo, y lo único que cambia es cuánto tiempo cabe en cada grupo.
 */
export const setViewDateBucket = (
  views: readonly PageSchemaView[],
  viewName: string,
  groupByDateBucket: PageDateBucket,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...readPageViewConfiguration(configuration),
    groupByDateBucket,
  }));

/** Por qué fecha coloca sus filas un calendario, o por ninguna todavía. */
export const setViewDateProperty = (
  views: readonly PageSchemaView[],
  viewName: string,
  dateProperty: null | string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({ ...readPageViewConfiguration(configuration), dateProperty }));

/** Cómo dibuja un gráfico lo que mide: barras, línea o pastel. */
export const setViewChartKind = (
  views: readonly PageSchemaView[],
  viewName: string,
  chartKind: PageChartKind,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({ ...readPageViewConfiguration(configuration), chartKind }));

/**
 * Qué mide un gráfico de cada grupo, y sobre qué número.
 *
 * Van juntos porque no se sostienen por separado: contar filas no pregunta por
 * ninguna propiedad, y sumar sin decir cuál no es nada. Elegir contar borra la
 * propiedad, para no dejar guardado un número que ya no se mira.
 */
export const setViewChartMeasure = (
  views: readonly PageSchemaView[],
  viewName: string,
  chartMeasure: PageChartMeasure,
  chartValueProperty: null | string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({
    ...readPageViewConfiguration(configuration),
    chartMeasure,
    chartValueProperty: chartMeasure === PAGE_CHART_MEASURE.COUNT ? null : chartValueProperty,
  }));

/** El emoji con el que se reconoce la vista en su pestaña, o ninguno. */
export const setViewIcon = (
  views: readonly PageSchemaView[],
  viewName: string,
  icon: null | string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({ ...readPageViewConfiguration(configuration), icon }));

/**
 * Shows or hides one property in one view.
 *
 * A view that never chose is showing everything, so the first click has to write
 * down everything except what was clicked — otherwise hiding one property would
 * read as «show only this one».
 */
export const toggleViewProperty = (
  views: readonly PageSchemaView[],
  viewName: string,
  propertyKey: string,
  availableKeys: readonly string[],
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => {
    const current = readPageViewConfiguration(configuration);
    const shown = readVisiblePropertyKeys(current.visibleProperties, availableKeys);
    const visibleProperties = shown.includes(propertyKey)
      ? shown.filter((key) => key !== propertyKey)
      : [...shown, propertyKey];
    return { ...current, visibleProperties: [...visibleProperties] };
  });
