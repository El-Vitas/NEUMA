export const SIDEBAR_STORAGE_KEY = 'company-brain-sidebar-collapsed';
export const SIDEBAR_COLLAPSED_WIDTH = 'w-14';
export const SIDEBAR_EXPANDED_WIDTH = 'w-60';
export const SIDEBAR_TRANSITION_DURATION_MS = 300;

export const SIDEBAR_HOVER_CLASS =
  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:transition-colors hover:duration-200';

export const SIDEBAR_PAGE_TREE_ITEM_SELECTOR = '[data-page-tree-item="true"]';
export const SIDEBAR_PAGE_TREE_LINK_SELECTOR = '[data-page-tree-link="true"]';
/** The list the pages of a space hang from, which is where moving between them makes sense. */
export const SIDEBAR_PAGE_TREE_SELECTOR = '[data-page-tree="true"]';
export const SIDEBAR_PAGE_TREE_TOGGLE_SELECTOR = '[data-page-tree-toggle="true"]';

export const SIDEBAR_TREE_INDENT_BASE_PX = 6;
export const SIDEBAR_TREE_INDENT_STEP_PX = 10;

/**
 * How many generations the tree steps in before it stops.
 *
 * Every step in is width the page's name no longer has. A branch can go as
 * deep as anyone wants, so past this point the nesting is told by the tree
 * folding and by the page's own path, not by pushing the name off the edge.
 */
export const SIDEBAR_TREE_MAX_INDENTED_DEPTH = 6;
