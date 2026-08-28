import type { PageViewShape, PageViewType } from '../types/page-schema.types.js';
import { PAGE_VIEW_GROUPING } from '../types/page-schema.types.js';
import type { PageViewDefinition } from './page-view.definitions.js';
import { PAGE_VIEW_DEFINITIONS } from './page-view.definitions.js';

export const getPageViewDefinition = (type: PageViewType): PageViewDefinition => PAGE_VIEW_DEFINITIONS[type];

/** How the rows of this kind of view arrive: one after another, or in groups. */
export const getPageViewShape = (type: PageViewType): PageViewShape => getPageViewDefinition(type).shape;

export const pageViewRequiresGrouping = (type: PageViewType): boolean =>
  getPageViewDefinition(type).grouping === PAGE_VIEW_GROUPING.REQUIRED;

export const pageViewSupportsGrouping = (type: PageViewType): boolean =>
  getPageViewDefinition(type).grouping !== PAGE_VIEW_GROUPING.UNSUPPORTED;
