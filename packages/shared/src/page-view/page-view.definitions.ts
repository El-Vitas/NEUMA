import type { PageViewGrouping, PageViewShape, PageViewType } from '../types/page-schema.types.js';
import { PAGE_VIEW_GROUPING, PAGE_VIEW_SHAPE, PAGE_VIEW_TYPE } from '../types/page-schema.types.js';

/**
 * What one kind of view is, as everything else needs to know it.
 *
 * A view says how its rows arrive and what it does with grouping, and nothing
 * about how it is drawn. Whoever draws it looks itself up by type. That is what
 * lets a new kind of view enter by adding one entry here instead of by touching
 * the code that reads the rows.
 */
export interface PageViewDefinition {
  readonly grouping: PageViewGrouping;
  readonly shape: PageViewShape;
  readonly type: PageViewType;
}

/**
 * Una tabla lee sus filas una tras otra, salvo que se le pida agrupar: entonces
 * las lee en grupos, como el tablero. La forma no es del tipo de vista sino de
 * lo que esa vista tiene puesto, y por eso `shape` dice cómo lee cuando nadie
 * le pidió nada.
 */
const tableDefinition: PageViewDefinition = {
  grouping: PAGE_VIEW_GROUPING.OPTIONAL,
  shape: PAGE_VIEW_SHAPE.FLAT,
  type: PAGE_VIEW_TYPE.TABLE,
};

const boardDefinition: PageViewDefinition = {
  grouping: PAGE_VIEW_GROUPING.REQUIRED,
  shape: PAGE_VIEW_SHAPE.GROUPED,
  type: PAGE_VIEW_TYPE.BOARD,
};

/**
 * Una lista lee sus filas una tras otra, como la tabla, y también puede
 * agruparlas: lo que cambia es que no las pone en cuadrícula, porque cada fila
 * es algo que se lee y no un dato que se compara con el de al lado.
 */
const listDefinition: PageViewDefinition = {
  grouping: PAGE_VIEW_GROUPING.OPTIONAL,
  shape: PAGE_VIEW_SHAPE.FLAT,
  type: PAGE_VIEW_TYPE.LIST,
};

/** Una galería lee lo mismo que la lista; lo que cambia es cuánto sitio le da a cada fila. */
const galleryDefinition: PageViewDefinition = {
  grouping: PAGE_VIEW_GROUPING.OPTIONAL,
  shape: PAGE_VIEW_SHAPE.FLAT,
  type: PAGE_VIEW_TYPE.GALLERY,
};

/**
 * Un calendario lee sus filas una tras otra y las reparte él mismo por los días
 * que dicen. No agrupa: sus montones son los días del mes, y ya los pone la
 * fecha de cada fila, no una propiedad que alguien elija.
 */
const calendarDefinition: PageViewDefinition = {
  grouping: PAGE_VIEW_GROUPING.UNSUPPORTED,
  shape: PAGE_VIEW_SHAPE.FLAT,
  type: PAGE_VIEW_TYPE.CALENDAR,
};

/**
 * Un gráfico es una agrupación dibujada: por eso agrupa como el tablero y lee
 * sus filas en grupos. Lo que dibuja no son las filas sino cuántas cayeron en
 * cada grupo, de modo que la propiedad por la que agrupa **es** su eje.
 */
const chartDefinition: PageViewDefinition = {
  grouping: PAGE_VIEW_GROUPING.REQUIRED,
  shape: PAGE_VIEW_SHAPE.GROUPED,
  type: PAGE_VIEW_TYPE.CHART,
};

export const PAGE_VIEW_DEFINITIONS = {
  [PAGE_VIEW_TYPE.TABLE]: tableDefinition,
  [PAGE_VIEW_TYPE.BOARD]: boardDefinition,
  [PAGE_VIEW_TYPE.LIST]: listDefinition,
  [PAGE_VIEW_TYPE.GALLERY]: galleryDefinition,
  [PAGE_VIEW_TYPE.CALENDAR]: calendarDefinition,
  [PAGE_VIEW_TYPE.CHART]: chartDefinition,
} as const satisfies Record<PageViewType, PageViewDefinition>;
