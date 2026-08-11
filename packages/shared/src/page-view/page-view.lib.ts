import type { PageViewType } from '../types/page-schema.types.js';
import type { PageViewDefinition } from './page-view.definitions.js';
import { PAGE_VIEW_DEFINITIONS } from './page-view.definitions.js';

export const getPageViewDefinition = (type: PageViewType): PageViewDefinition => PAGE_VIEW_DEFINITIONS[type];

export const pageViewRequiresGrouping = (type: PageViewType): boolean =>
  getPageViewDefinition(type).capabilities.requiresGrouping;

export const pageViewSupportsGrouping = (type: PageViewType): boolean =>
  getPageViewDefinition(type).capabilities.supportsGrouping;
