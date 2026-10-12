export const SIDEBAR_STORAGE_KEY = 'neuma-sidebar-collapsed';
export const SIDEBAR_COLLAPSED_WIDTH = 'w-14';
export const SIDEBAR_EXPANDED_WIDTH = 'w-60';
export const SIDEBAR_TRANSITION_DURATION_MS = 300;

export const SIDEBAR_HOVER_CLASS =
  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:transition-colors hover:duration-200';

export const SIDEBAR_PAGE_TREE_ITEM_SELECTOR = '[data-page-tree-item="true"]';
export const SIDEBAR_PAGE_TREE_LINK_SELECTOR = '[data-page-tree-link="true"]';
export const SIDEBAR_PAGE_TREE_SELECTOR = '[data-page-tree="true"]';
export const SIDEBAR_PAGE_TREE_TOGGLE_SELECTOR = '[data-page-tree-toggle="true"]';

export const SIDEBAR_TREE_INDENT_BASE_PX = 6;
export const SIDEBAR_TREE_INDENT_STEP_PX = 10;

/** Past this depth the indent stops growing so page names keep their width. */
export const SIDEBAR_TREE_MAX_INDENTED_DEPTH = 6;
