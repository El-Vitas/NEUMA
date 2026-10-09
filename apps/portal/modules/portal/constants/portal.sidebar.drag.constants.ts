export const PORTAL_SIDEBAR_PAGE_DROP_TARGET_ATTRIBUTE = 'data-sidebar-page-drop-target';

/** Fraction of the row height, centered, that nests. Wide because nesting is the most common drop. */
export const PORTAL_SIDEBAR_ROW_NESTING_BAND = 0.6;

export const PORTAL_SIDEBAR_PAGE_KEYBOARD_MOVE = {
  Indent: 'indent',
  Outdent: 'outdent',
} as const;

/** During dragover the browser exposes the type but not the data, which space rows use to detect a page drag. */
export const PORTAL_SIDEBAR_PAGE_DRAG_TYPE = 'application/x-company-brain-page';

export const PORTAL_SIDEBAR_SPACE_DRAG_TYPE = 'application/x-company-brain-space';
