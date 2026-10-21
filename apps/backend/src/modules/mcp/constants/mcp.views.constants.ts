import { PAGE_PROPERTY_TYPE, PAGE_VIEW_TYPE } from '@neuma/shared';
import type { McpTypedViewReference } from '../types/mcp.views.types';

/** The views that are drawn on a scale of time, and the ones that draw cards. */
export const MCP_SCALED_VIEW_TYPES: readonly string[] = [PAGE_VIEW_TYPE.CALENDAR, PAGE_VIEW_TYPE.TIMELINE];

export const MCP_CARD_VIEW_TYPES: readonly string[] = [PAGE_VIEW_TYPE.GALLERY, PAGE_VIEW_TYPE.BOARD];

/** The columns a view points at, the setting of the view each one is kept in and the kind of column it must be. */
export const MCP_TYPED_VIEW_REFERENCES: readonly McpTypedViewReference[] = [
  { configurationKey: 'dateProperty', input: 'dateColumn', type: PAGE_PROPERTY_TYPE.DATE },
  { configurationKey: 'endDateProperty', input: 'endDateColumn', type: PAGE_PROPERTY_TYPE.DATE },
  { configurationKey: 'coverProperty', input: 'coverColumn', type: PAGE_PROPERTY_TYPE.FILES },
];

/** A day written as people write it in a request. */
export const MCP_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
