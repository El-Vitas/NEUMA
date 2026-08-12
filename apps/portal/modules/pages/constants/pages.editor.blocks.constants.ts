import type { AttributeSpec } from 'prosemirror-model';
import type { PageEditorBlockDragState } from '../types/pages.editor.block-drag.types';

export const PAGE_EDITOR_BLOCK_ID_ATTRIBUTE = 'data-block-id';

export const PAGE_EDITOR_OPTIONAL_BLOCK_ID: AttributeSpec = { default: null };

export const PAGE_EDITOR_TEXT_COLOR_ATTRIBUTE = 'data-text-color';

export const PAGE_EDITOR_BACKGROUND_COLOR_ATTRIBUTE = 'data-background-color';

export const PAGE_EDITOR_OPTIONAL_BLOCK_COLOR: AttributeSpec = { default: null };

export const PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE = 'comments';

export const PAGE_EDITOR_OPTIONAL_BLOCK_COMMENTS: AttributeSpec = { default: null };

/** A block that has been talked about says so, so a comment is never invisible. */
export const PAGE_EDITOR_BLOCK_COMMENTED_ATTRIBUTE = 'data-commented';

/** The bubble parked in the right margin of a block that carries comments. */
export const PAGE_EDITOR_COMMENT_MARK_STYLE_CLASS = [
  'float-right ml-2 flex cursor-pointer items-center gap-1',
  'select-none text-muted-foreground text-xs hover:text-foreground',
].join(' ');

export const PAGE_EDITOR_BLOCK_HANDLE_PLUGIN_KEY = 'page-editor-block-handle-plugin';

export const PAGE_EDITOR_BLOCK_HANDLE_CLASS = 'page-editor-block-handle';

export const PAGE_EDITOR_BLOCK_HANDLE_STYLE_CLASS =
  'w-5 cursor-grab select-none text-center text-muted-foreground hover:text-foreground';

export const PAGE_EDITOR_BLOCK_INSERT_CLASS = 'page-editor-block-insert';

export const PAGE_EDITOR_BLOCK_INSERT_STYLE_CLASS =
  'w-5 cursor-pointer select-none text-center text-muted-foreground hover:text-foreground';

export const PAGE_EDITOR_BLOCK_GUTTER_STYLE_CLASS = '-ml-11 float-left flex items-start gap-0.5';

export const PAGE_EDITOR_BLOCK_PROBE_INSET_PX = 40;

/** How far into the page margin a block still answers with its buttons. */
export const PAGE_EDITOR_GUTTER_REACH_PX = 56;

export const PAGE_EDITOR_BLOCK_MENU_PLUGIN_KEY = 'page-editor-block-menu-plugin';

/** How far the pointer may travel on a grip before the press means dragging instead of asking. */
export const PAGE_EDITOR_GRIP_CLICK_TOLERANCE_PX = 4;

/** The menu drops below the line it belongs to, rather than over the words it is about. */
export const PAGE_EDITOR_BLOCK_MENU_DROP_PX = 28;

/** How a block arrived at from a link is marked, and for how long. */
export const PAGE_EDITOR_BLOCK_ARRIVAL_STYLE_CLASSES: readonly string[] = ['ring-2', 'ring-primary', 'ring-offset-2'];

export const PAGE_EDITOR_BLOCK_ARRIVAL_MS = 2500;

/** How long a link waits for the page to draw the block it points at. */
export const PAGE_EDITOR_BLOCK_ARRIVAL_WAIT_MS = 5000;

export const PAGE_EDITOR_BLOCK_DRAG_PLUGIN_KEY = 'page-editor-block-drag-plugin';

export const PAGE_EDITOR_IDLE_DRAG_STATE: PageEditorBlockDragState = { placement: null, range: null };

export const PAGE_EDITOR_DROP_INDICATOR_CLASS = 'page-editor-drop-indicator';

export const PAGE_EDITOR_DROP_INDICATOR_STYLE_CLASS = 'pointer-events-none -my-px h-0.5 rounded-full bg-primary';

export const PAGE_EDITOR_DRAGGED_BLOCK_STYLE_CLASS = 'opacity-40';

export const PAGE_EDITOR_DRAG_GHOST_STYLE_CLASS = [
  'pointer-events-none fixed top-0 left-0 z-50',
  'max-h-40 overflow-hidden opacity-60',
  'border border-border bg-surface px-3 py-2 shadow-lg',
].join(' ');

export const PAGE_EDITOR_DRAG_GHOST_OFFSET_PX = 12;

export const PAGE_EDITOR_DRAG_SCROLL_ZONE_PX = 72;

export const PAGE_EDITOR_DRAG_SCROLL_STEP_PX = 24;

export const PAGE_EDITOR_DRAG_SWEEP_STEP_PX = 2;

export const PAGE_EDITOR_DRAG_SWEEP_REACH_PX = 12;

export const PAGE_EDITOR_SCROLLABLE_OVERFLOW_VALUES = new Set(['auto', 'scroll']);

export const PAGE_EDITOR_PAGE_TYPE = 'doc';

export const PAGE_EDITOR_BLOCK_CHILDREN_TYPE = 'block_children';

export const PAGE_EDITOR_NESTED_BLOCK_TYPE = 'nested_block';

export const PAGE_EDITOR_TABLE_CELL_TYPE = 'table_cell';

export const PAGE_EDITOR_TOGGLE_TYPE = 'toggle';

/** The group every block that stands on a page belongs to. */
export const PAGE_EDITOR_BLOCK_GROUP = 'block';

export const PAGE_EDITOR_COLUMN_ROW_TYPE = 'column_list';

export const PAGE_EDITOR_COLUMN_TYPE = 'column';

/** The containers whose children are blocks a person selects one at a time. */
export const PAGE_EDITOR_BLOCK_HOLDER_TYPES: readonly string[] = [
  PAGE_EDITOR_PAGE_TYPE,
  PAGE_EDITOR_BLOCK_CHILDREN_TYPE,
  PAGE_EDITOR_NESTED_BLOCK_TYPE,
];

/** Only containers declared as `block+` take a block dropped among their children. */
export const PAGE_EDITOR_SIBLING_BLOCK_CONTENT = 'block+';

export const PAGE_EDITOR_BLOCK_CHILDREN_CLASS = 'ml-1 border-border/70 border-l-2 pl-4';

export const PAGE_EDITOR_COLUMN_LIST_CLASS = 'my-4 flex flex-col gap-4 sm:flex-row sm:gap-8 sm:py-3';

export const PAGE_EDITOR_COLUMN_CLASS = 'min-w-0 flex-1';

export const PAGE_EDITOR_COLUMN_MINIMUM_WIDTH = 0.15;

export const PAGE_EDITOR_COLUMN_DIVIDER_ATTRIBUTE = 'data-column-divider';

export const PAGE_EDITOR_COLUMN_DIVIDER_STYLE_CLASS = [
  'group -mx-4 -my-3 hidden w-8 shrink-0 cursor-col-resize items-stretch justify-center sm:flex',
].join(' ');

export const PAGE_EDITOR_COLUMN_DIVIDER_BAR_STYLE_CLASS =
  'w-1 rounded-full bg-transparent transition-colors group-hover:bg-primary/40';

export const PAGE_EDITOR_COLUMN_EDGE_RATIO = 0.25;

export const PAGE_EDITOR_COLUMN_EDGE_MAX_PX = 120;

export const PAGE_EDITOR_DROP_COLUMN_LEFT_STYLE_CLASS = '-ml-0.5 border-primary border-l-2';

export const PAGE_EDITOR_DROP_COLUMN_RIGHT_STYLE_CLASS = '-mr-0.5 border-primary border-r-2';

export const PAGE_EDITOR_CALLOUT_CLASS =
  'my-4 border border-border border-l-4 border-l-primary bg-surface-container-low px-4 py-3';

export const PAGE_EDITOR_TASK_ITEM_TYPE = 'task_item';

export const PAGE_EDITOR_TASK_LIST_CLASS = 'my-4 list-none ps-0';

export const PAGE_EDITOR_TASK_ITEM_STYLE_CLASS = 'flex items-start gap-2';

export const PAGE_EDITOR_TASK_CHECKBOX_STYLE_CLASS = [
  'mt-1.5 flex size-4 shrink-0 cursor-pointer items-center justify-center',
  'border border-border text-[10px] leading-none',
].join(' ');

export const PAGE_EDITOR_TASK_BOX_DONE_STYLE_CLASSES: readonly string[] = [
  'bg-primary',
  'border-primary',
  'text-primary-foreground',
];

export const PAGE_EDITOR_TASK_DONE_MARK = '\u2713';

export const PAGE_EDITOR_TASK_CONTENT_STYLE_CLASS = 'min-w-0 flex-1';

export const PAGE_EDITOR_TASK_DONE_STYLE_CLASSES: readonly string[] = ['line-through', 'text-muted-foreground'];

export const PAGE_EDITOR_COLLECTION_CLASS = 'my-4 border border-border bg-surface-container-low px-4 py-3';

export const PAGE_EDITOR_TOGGLE_SUMMARY_STYLE_CLASS =
  'flex list-none items-center gap-2 [&::-webkit-details-marker]:hidden';

export const PAGE_EDITOR_TOGGLE_ARROW_STYLE_CLASS = [
  'inline-flex size-5 shrink-0 items-center justify-center',
  'cursor-pointer select-none text-muted-foreground hover:text-foreground',
  'transition-transform',
].join(' ');

export const PAGE_EDITOR_TOGGLE_ARROW_OPEN_STYLE_CLASS = 'rotate-90';

export const PAGE_EDITOR_TOGGLE_TITLE_STYLE_CLASS = 'flex-1 outline-none';
