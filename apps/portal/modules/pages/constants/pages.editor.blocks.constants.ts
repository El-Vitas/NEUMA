import type { PageCalloutIcon } from '@company-brain/shared';
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

/** The bubble parked at the right edge of a block that carries comments, level with its middle. */
export const PAGE_EDITOR_COMMENT_MARK_STYLE_CLASS = [
  '-translate-y-1/2 absolute top-1/2 right-0 flex cursor-pointer items-center gap-1',
  'select-none text-muted-foreground text-xs tabular-nums hover:text-foreground',
].join(' ');

/** The block wearing the bubble becomes the frame the bubble is placed against. */
export const PAGE_EDITOR_COMMENTED_BLOCK_STYLE_CLASS = 'relative';

/** Which remark a commented fragment of text belongs to. */
export const PAGE_EDITOR_COMMENT_ID_ATTRIBUTE = 'data-comment-id';

/** The block type this version does not know, named on the placeholder that stands in for it. */
export const PAGE_EDITOR_UNSUPPORTED_ATTRIBUTE = 'data-unsupported-block';

export const PAGE_EDITOR_UNSUPPORTED_TYPE = 'unsupported';

/** A placeholder that reads as held rather than broken: quiet, outlined, and named. */
export const PAGE_EDITOR_UNSUPPORTED_STYLE_CLASS =
  'my-4 flex select-none items-center gap-2 border border-border border-dashed bg-surface-low px-3 py-2 text-muted-foreground text-sm';

/** A commented fragment is underlined rather than painted, so it never fights the block's own colours. */
export const PAGE_EDITOR_COMMENTED_TEXT_STYLE_CLASS =
  'cursor-pointer underline decoration-2 decoration-dotted underline-offset-4 decoration-primary/70 hover:decoration-primary';

/** The speech mark drawn on a commented block, from the same icon family as the rest of the app. */
export const PAGE_EDITOR_COMMENT_MARK_ICON_PATH =
  'M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z';

export const PAGE_EDITOR_COMMENT_MARK_ICON_CLASS = 'size-3.5 shrink-0';

export const PAGE_EDITOR_SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export const PAGE_EDITOR_BLOCK_HANDLE_PLUGIN_KEY = 'page-editor-block-handle-plugin';

export const PAGE_EDITOR_BLOCK_HANDLE_CLASS = 'page-editor-block-handle';

/**
 * The grip: drawn small so it does not shout, pressed on a target far larger
 * than what is drawn. The guidance asks for 44px of reach, and an icon that
 * size beside a line of text would be the loudest thing on the page.
 */
export const PAGE_EDITOR_BLOCK_HANDLE_STYLE_CLASS = [
  'relative inline-flex items-center justify-center',
  'cursor-grab select-none text-center text-muted-foreground hover:text-foreground',
  "before:absolute before:-inset-3 before:content-['']",
].join(' ');

export const PAGE_EDITOR_BLOCK_INSERT_CLASS = 'page-editor-block-insert';

export const PAGE_EDITOR_BLOCK_INSERT_STYLE_CLASS = [
  'relative inline-flex items-center justify-center',
  'cursor-pointer select-none text-center text-muted-foreground hover:text-foreground',
  "before:absolute before:-inset-3 before:content-['']",
].join(' ');

/**
 * How big the pair of buttons is drawn, following the block's own line.
 *
 * A block nested inside another sits on a tighter line and has less room to its
 * left, so its pair comes out smaller rather than pushing into the text beside
 * it. Neither end is left to chance: too small stops being a target, too big
 * breaks the margin.
 */
export const PAGE_EDITOR_GUTTER_BUTTON_MIN_PX = 18;

export const PAGE_EDITOR_GUTTER_BUTTON_MAX_PX = 24;

/** How much of the line a button takes up. */
export const PAGE_EDITOR_GUTTER_BUTTON_RATIO = 0.8;

/** The triangle is a quieter affordance than the two beside it, and takes up less room accordingly. */
export const PAGE_EDITOR_GUTTER_FOLD_RATIO = 0.7;

/** The breathing room kept between the pair and the block it belongs to. */
export const PAGE_EDITOR_GUTTER_BLOCK_GAP_PX = 5;

/**
 * The pair of buttons a block offers, parked just outside its left edge.
 *
 * It is placed against the block rather than floated into the text, because a
 * float lands wherever the flow happens to be: beside a tall heading it rode
 * high, and beside a block holding others it landed on top of them.
 */
export const PAGE_EDITOR_BLOCK_GUTTER_STYLE_CLASS =
  'pointer-events-auto absolute flex -translate-x-full items-center gap-1 pr-1.5';

/**
 * The nodes that hold nothing inside them.
 *
 * Handing one of these an empty `content` on the way out would be a shape the
 * shared contract refuses, and the refusal lands in the middle of a keystroke.
 */
export const PAGE_EDITOR_LEAF_NODE_TYPES: readonly string[] = [
  'code',
  'collection',
  'divider',
  'em',
  'embed',
  'file',
  'hard_break',
  'image',
  'link',
  'mention',
  'strong',
  'text',
];

/**
 * Attributes that only mean something when they are true.
 *
 * Written when they are, absent when they are not, so a page full of headings
 * nobody folded reads exactly as it did before folding existed.
 */
export const PAGE_EDITOR_ONLY_WHEN_TRUE_ATTRIBUTES: readonly string[] = ['collapsed'];

/**
 * Attributes that only mean something when they are more than one.
 *
 * A cell that reaches exactly one column and one row is every cell there is, so
 * writing it down would say nothing and would change every table already saved.
 */
export const PAGE_EDITOR_ONLY_WHEN_BEYOND_ONE_ATTRIBUTES: readonly string[] = ['colspan', 'rowspan'];

/** What a folded heading is holding: kept in the page, taken out of sight. */
export const PAGE_EDITOR_FOLDED_STYLE_CLASS = 'hidden';

/** The triangle that folds a heading, parked outside its left edge like the block grip. */
export const PAGE_EDITOR_HEADING_FOLD_CLASS = 'page-editor-heading-fold';

export const PAGE_EDITOR_HEADING_FOLD_STYLE_CLASS =
  'shrink-0 cursor-pointer select-none text-center text-muted-foreground leading-none hover:text-foreground';

/**
 * The heading becomes the frame its own fold button is shown against, so the
 * button can stay out of the way until the pointer is on the heading.
 */
export const PAGE_EDITOR_FOLDABLE_HEADING_STYLE_CLASS = 'group';

/**
 * The button at the end of a heading that folds it.
 *
 * Drawn quietly and only when the heading is under the pointer — except when
 * what it is holding is out of sight, and then it stays, because a folded
 * heading with no sign would read as a heading with nothing under it.
 */
export const PAGE_EDITOR_HEADING_FOLD_END_STYLE_CLASS = [
  'relative ml-3 inline-flex select-none items-center justify-center align-middle',
  'cursor-pointer text-muted-foreground text-base leading-none hover:text-foreground',
  'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
  "before:absolute before:-inset-3 before:content-['']",
].join(' ');

/** Once folded it stays in sight, whatever the pointer is doing. */
export const PAGE_EDITOR_FOLDED_HEADING_MARK_STYLE_CLASS = 'opacity-100';

/** The invitation to write, drawn beside the cursor without taking up room of its own. */
export const PAGE_EDITOR_PLACEHOLDER_STYLE_CLASS =
  'relative before:pointer-events-none before:absolute before:text-muted-foreground/60 before:content-[attr(data-placeholder)]';

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

/** What the editor's writable surface is called, which is also what every rule about how a block looks says. */
export const PAGE_EDITOR_EDITABLE_SURFACE_CLASS = 'ProseMirror';

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

export const PAGE_EDITOR_LIST_ITEM_TYPE = 'list_item';

export const PAGE_EDITOR_TABLE_CELL_TYPE = 'table_cell';

export const PAGE_EDITOR_TABLE_TYPE = 'table';

/** How big a table is when it is first drawn, counting the header among the rows. */
export const PAGE_EDITOR_TABLE_SIZE = { columns: 3, rows: 3 } as const;

/** Narrower than this a column cannot be read, so a column edge stops there. */
export const PAGE_EDITOR_TABLE_MINIMUM_CELL_WIDTH = 60;

/** What is too wide travels within the table, never taking the page with it. */
export const PAGE_EDITOR_TABLE_SCROLL_STYLE_CLASS = 'overflow-x-auto';

/** What a cell of a table carries beyond what it says, in the shape a table expects to find. */
export const PAGE_EDITOR_TABLE_CELL_ATTRS: Readonly<Record<string, AttributeSpec>> = {
  colspan: { default: 1 },
  colwidth: { default: null },
  rowspan: { default: 1 },
};

export const PAGE_EDITOR_TOGGLE_TYPE = 'toggle';

export const PAGE_EDITOR_CALLOUT_TYPE = 'callout';

export const PAGE_EDITOR_IMAGE_TYPE = 'image';

/** Where the page keeps the chooser that answers for every file put on it. */
export const PAGE_EDITOR_FILE_INPUT_SELECTOR = '[data-page-file-input]';

/** Narrower than this an image says nothing, so the edge stops there. */
export const PAGE_EDITOR_IMAGE_MINIMUM_WIDTH = 0.1;

export const PAGE_EDITOR_IMAGE_FIGURE_STYLE_CLASS = 'group relative my-6 flex flex-col gap-2';

/** Where the image stands in the column of writing. */
export const PAGE_EDITOR_IMAGE_ALIGN_STYLE_CLASSES: Readonly<Record<string, string>> = {
  center: 'items-center text-center',
  left: 'items-start text-start',
  right: 'items-end text-end',
};

export const PAGE_EDITOR_IMAGE_STYLE_CLASS = 'h-auto max-w-full';

/** The line under an image: what a reader sees, and what is read out to whoever cannot see it. */
export const PAGE_EDITOR_IMAGE_CAPTION_STYLE_CLASS = [
  'min-h-11 w-full border-none bg-transparent text-muted-foreground text-sm',
  'outline-none focus-visible:ring-0',
].join(' ');

/** The edge an image is stretched by, shown once the pointer is on the image. */
export const PAGE_EDITOR_IMAGE_HANDLE_STYLE_CLASS = [
  'absolute top-1/2 right-0 h-16 w-1.5 -translate-y-1/2 cursor-col-resize bg-primary',
  'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
].join(' ');

export const PAGE_EDITOR_CODE_TYPE = 'code_block';

/** A step of indentation inside code: two spaces, written as such rather than as a tab. */
export const PAGE_EDITOR_CODE_INDENT = '  ';

/** The controls of a code block sit above it, out of the way of the code itself. */
export const PAGE_EDITOR_CODE_BAR_STYLE_CLASS = 'mt-6 flex items-center justify-end gap-1 bg-surface-low px-2 pt-2';

export const PAGE_EDITOR_CODE_LANGUAGE_STYLE_CLASS = [
  'me-auto min-h-11 border-none bg-transparent px-1 text-muted-foreground text-xs',
  'outline-none focus-visible:ring-0',
].join(' ');

export const PAGE_EDITOR_CODE_BUTTON_STYLE_CLASS = [
  'relative inline-flex size-5 shrink-0 items-center justify-center',
  'cursor-pointer select-none text-muted-foreground text-xs hover:text-foreground',
  "before:absolute before:-inset-3 before:content-['']",
].join(' ');

/** Long lines fold onto the next instead of running off the side. */
export const PAGE_EDITOR_CODE_WRAPPED_STYLE_CLASS = 'whitespace-pre-wrap';

export const PAGE_EDITOR_CALLOUT_ICON_ATTRIBUTE = 'icon';

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

/**
 * How much of a block's height, top and bottom, means "a new line here".
 *
 * Those bands are read before the side ones, so aiming above or below a block
 * wins over making a column of it. The grip lives in the left margin, so the
 * pointer starts there on every drag: without this, the left side answered
 * first and dropping a block above another was almost impossible.
 */
export const PAGE_EDITOR_DROP_EDGE_RATIO = 0.3;

/** However thin the block, its edges still offer somewhere to aim. */
export const PAGE_EDITOR_DROP_EDGE_MIN_PX = 10;

/** However narrow a block is, its sides still offer somewhere to aim at. */
export const PAGE_EDITOR_COLUMN_EDGE_MIN_PX = 44;

export const PAGE_EDITOR_COLUMN_EDGE_RATIO = 0.25;

export const PAGE_EDITOR_COLUMN_EDGE_MAX_PX = 120;

export const PAGE_EDITOR_DROP_COLUMN_LEFT_STYLE_CLASS = '-ml-0.5 border-primary border-l-2';

export const PAGE_EDITOR_DROP_COLUMN_RIGHT_STYLE_CLASS = '-mr-0.5 border-primary border-r-2';

export const PAGE_EDITOR_CALLOUT_CLASS =
  'my-4 flex gap-3 border border-border border-l-4 border-l-primary bg-surface-low px-4 py-3';

/** The mark sits beside what the aside says, on the first line, and never moves with the writing. */
export const PAGE_EDITOR_CALLOUT_ICON_STYLE_CLASS = 'shrink-0 select-none text-lg leading-7';

/** What each kind of aside is drawn as. The page keeps the kind; this is only how it is shown. */
export const PAGE_EDITOR_CALLOUT_ICON_GLYPHS: Readonly<Record<PageCalloutIcon, string>> = {
  blocked: '⛔',
  done: '✅',
  idea: '💡',
  info: 'ℹ️',
  pinned: '📌',
  warning: '⚠️',
};

export const PAGE_EDITOR_CALLOUT_BODY_STYLE_CLASS = 'min-w-0 flex-1';

export const PAGE_EDITOR_TASK_ITEM_TYPE = 'task_item';

/** What a page calls a point of a list: the same shape under two names. */
export const PAGE_EDITOR_LIST_POINT_TYPES: readonly string[] = [PAGE_EDITOR_LIST_ITEM_TYPE, PAGE_EDITOR_TASK_ITEM_TYPE];

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

export const PAGE_EDITOR_COLLECTION_CLASS = 'my-4 border border-border bg-surface-low px-4 py-3';

export const PAGE_EDITOR_TOGGLE_HEAD_STYLE_CLASS = 'flex items-center gap-2';

/** What the toggle holds sits under its title, past the arrow, so it reads as held by it. */
export const PAGE_EDITOR_TOGGLE_CHILDREN_STYLE_CLASS = 'ps-7';

export const PAGE_EDITOR_TOGGLE_ARROW_STYLE_CLASS = [
  'relative inline-flex size-5 shrink-0 items-center justify-center',
  'cursor-pointer select-none text-muted-foreground hover:text-foreground',
  'transition-transform',
  "before:absolute before:-inset-3 before:content-['']",
].join(' ');

export const PAGE_EDITOR_TOGGLE_ARROW_OPEN_STYLE_CLASS = 'rotate-90';

export const PAGE_EDITOR_TOGGLE_TITLE_STYLE_CLASS = [
  'min-h-11 w-full flex-1 border-none bg-transparent font-semibold text-foreground',
  'outline-none focus-visible:ring-0',
].join(' ');
