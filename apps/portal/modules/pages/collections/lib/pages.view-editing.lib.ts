import type { PageViewType } from '@company-brain/shared';
import {
  canPagePropertyGroupBoard,
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
  PageViewGroupedOutcome,
} from '../types/pages.schema.types';

/**
 * La clase de vista que nombra lo elegido en un desplegable, si nombra una que
 * exista. Un desplegable entrega texto suelto, y de ahí a una clase de vista se
 * pasa mirando la lista, no afirmándolo.
 */
export const readPageViewType = (chosen: string): PageViewType | undefined =>
  PAGE_VIEW_TYPE_VALUES.find((candidate) => candidate === chosen);

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

const rewriteView = (
  views: readonly PageSchemaView[],
  viewName: string,
  rewrite: (configuration: PageSchemaView['configuration']) => PageSchemaView['configuration'],
): readonly PageSchemaView[] =>
  views.map((view) => (view.name === viewName ? { ...view, configuration: rewrite(view.configuration) } : view));

export const setViewGroupBy = (
  views: readonly PageSchemaView[],
  viewName: string,
  groupBy: string,
): readonly PageSchemaView[] =>
  rewriteView(views, viewName, (configuration) => ({ ...readPageViewConfiguration(configuration), groupBy }));

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
