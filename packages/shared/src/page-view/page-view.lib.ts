import type { PageViewShape, PageViewType } from '../types/page-schema.types.js';
import { PAGE_VIEW_GROUPING, PAGE_VIEW_SHAPE } from '../types/page-schema.types.js';
import type { PageViewDefinition } from './page-view.definitions.js';
import { PAGE_VIEW_DEFINITIONS } from './page-view.definitions.js';

export const getPageViewDefinition = (type: PageViewType): PageViewDefinition => PAGE_VIEW_DEFINITIONS[type];

/** How the rows of this kind of view arrive: one after another, or in groups. */
export const getPageViewShape = (type: PageViewType): PageViewShape => getPageViewDefinition(type).shape;

export const pageViewRequiresGrouping = (type: PageViewType): boolean =>
  getPageViewDefinition(type).grouping === PAGE_VIEW_GROUPING.REQUIRED;

export const pageViewSupportsGrouping = (type: PageViewType): boolean =>
  getPageViewDefinition(type).grouping !== PAGE_VIEW_GROUPING.UNSUPPORTED;

/**
 * Cómo llegan las filas de esta vista, contando lo que tiene puesto.
 *
 * No basta con saber qué clase de vista es: una tabla lee sus filas una tras
 * otra hasta que alguien le pide agrupar, y entonces las lee en grupos. Quien
 * dibuja y quien reparte las filas tienen que estar de acuerdo en eso, así que
 * lo preguntan aquí y no cada uno por su cuenta.
 */
export const readPageViewShape = (type: PageViewType, groupBy: null | string): PageViewShape => {
  const definition = getPageViewDefinition(type);
  if (definition.shape === PAGE_VIEW_SHAPE.GROUPED) return PAGE_VIEW_SHAPE.GROUPED;
  return pageViewSupportsGrouping(type) && groupBy !== null ? PAGE_VIEW_SHAPE.GROUPED : definition.shape;
};
