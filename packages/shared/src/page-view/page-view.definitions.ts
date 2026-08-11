import type { PageViewType } from '../types/page-schema.types.js';
import { PAGE_VIEW_TYPE } from '../types/page-schema.types.js';

export interface PageViewCapabilities {
  readonly requiresGrouping: boolean;
  readonly supportsGrouping: boolean;
}

export interface PageViewDefinition {
  readonly type: PageViewType;
  readonly capabilities: PageViewCapabilities;
}

const tableDefinition: PageViewDefinition = {
  type: PAGE_VIEW_TYPE.TABLE,
  capabilities: { requiresGrouping: false, supportsGrouping: false },
};

const boardDefinition: PageViewDefinition = {
  type: PAGE_VIEW_TYPE.BOARD,
  capabilities: { requiresGrouping: true, supportsGrouping: true },
};

export const PAGE_VIEW_DEFINITIONS = {
  [PAGE_VIEW_TYPE.TABLE]: tableDefinition,
  [PAGE_VIEW_TYPE.BOARD]: boardDefinition,
} as const satisfies Record<PageViewType, PageViewDefinition>;
