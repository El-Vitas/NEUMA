import type { PageViewShape, PageViewType } from '../types/page-schema.types.js';
import { PAGE_VIEW_GROUPING, PAGE_VIEW_SHAPE } from '../types/page-schema.types.js';
import type { PageViewDefinition } from './page-view.definitions.js';
import { PAGE_VIEW_DEFINITIONS } from './page-view.definitions.js';

export const getPageViewDefinition = (type: PageViewType): PageViewDefinition => PAGE_VIEW_DEFINITIONS[type];

export const getPageViewShape = (type: PageViewType): PageViewShape => getPageViewDefinition(type).shape;

export const pageViewRequiresGrouping = (type: PageViewType): boolean =>
  getPageViewDefinition(type).grouping === PAGE_VIEW_GROUPING.REQUIRED;

export const pageViewSupportsGrouping = (type: PageViewType): boolean =>
  getPageViewDefinition(type).grouping !== PAGE_VIEW_GROUPING.UNSUPPORTED;

/** The type alone is not enough: a table asked to group reads in groups. Renderer and distributor both ask here. */
export const readPageViewShape = (type: PageViewType, groupBy: null | string): PageViewShape => {
  const definition = getPageViewDefinition(type);
  if (definition.shape === PAGE_VIEW_SHAPE.GROUPED) return PAGE_VIEW_SHAPE.GROUPED;
  return pageViewSupportsGrouping(type) && groupBy !== null ? PAGE_VIEW_SHAPE.GROUPED : definition.shape;
};
