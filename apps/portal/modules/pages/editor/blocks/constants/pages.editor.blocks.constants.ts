import { PAGE_DOCUMENT_UNSUPPORTED_NODE, type PageCalloutIcon } from '@neuma/shared';
import type { PageEditorBlockDragState } from '../types/pages.editor.block-drag.types';

export const PAGE_EDITOR_BLOCK_ID_ATTRIBUTE = 'data-block-id';

export const PAGE_EDITOR_TEXT_COLOR_ATTRIBUTE = 'data-text-color';

export const PAGE_EDITOR_BACKGROUND_COLOR_ATTRIBUTE = 'data-background-color';

export const PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE = 'comments';

export const PAGE_EDITOR_BLOCK_COMMENTED_ATTRIBUTE = 'data-commented';

export const PAGE_EDITOR_COMMENT_MARK_STYLE_CLASS = [
  '-translate-y-1/2 absolute top-1/2 right-0 flex cursor-pointer items-center gap-1',
  'select-none text-muted-foreground text-xs tabular-nums hover:text-foreground',
].join(' ');

export const PAGE_EDITOR_COMMENTED_BLOCK_STYLE_CLASS = 'relative';

export const PAGE_EDITOR_COMMENT_ID_ATTRIBUTE = 'data-comment-id';

export const PAGE_EDITOR_UNSUPPORTED_ATTRIBUTE = 'data-unsupported-block';

export const PAGE_EDITOR_UNSUPPORTED_TYPE = PAGE_DOCUMENT_UNSUPPORTED_NODE;

export const PAGE_EDITOR_UNSUPPORTED_STYLE_CLASS =
  'my-4 flex select-none items-center gap-2 border border-border border-dashed bg-surface-low px-3 py-2 text-muted-foreground text-sm';

/** Underlined rather than painted, so it never fights the block's own colours. */
export const PAGE_EDITOR_COMMENTED_TEXT_STYLE_CLASS =
  'cursor-pointer underline decoration-2 decoration-dotted underline-offset-4 decoration-primary/70 hover:decoration-primary';

export const PAGE_EDITOR_COMMENT_MARK_ICON_PATH =
  'M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z';

export const PAGE_EDITOR_COMMENT_MARK_ICON_CLASS = 'size-3.5 shrink-0';

export const PAGE_EDITOR_SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export const PAGE_EDITOR_BLOCK_HANDLE_PLUGIN_KEY = 'page-editor-block-handle-plugin';

export const PAGE_EDITOR_BLOCK_HANDLE_CLASS = 'page-editor-block-handle';

/** Drawn small, with a larger hit area from `before:`, to approach the 44px touch target without a loud icon. */
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

/** Bounds for the button pair, which scales with the block's line: too small stops being a target. */
export const PAGE_EDITOR_GUTTER_BUTTON_MIN_PX = 18;

export const PAGE_EDITOR_GUTTER_BUTTON_MAX_PX = 24;

export const PAGE_EDITOR_GUTTER_BUTTON_RATIO = 0.8;

export const PAGE_EDITOR_GUTTER_FOLD_RATIO = 0.7;

export const PAGE_EDITOR_GUTTER_BLOCK_GAP_PX = 5;

export const PAGE_EDITOR_BLOCK_GUTTER_STYLE_CLASS =
  'pointer-events-auto absolute flex -translate-x-full items-center gap-1 pr-1.5';

export const PAGE_EDITOR_FOLDED_STYLE_CLASS = 'hidden';

export const PAGE_EDITOR_HEADING_FOLD_CLASS = 'page-editor-heading-fold';

export const PAGE_EDITOR_HEADING_FOLD_STYLE_CLASS =
  'shrink-0 cursor-pointer select-none text-center text-muted-foreground leading-none hover:text-foreground';

export const PAGE_EDITOR_FOLDABLE_HEADING_STYLE_CLASS = 'group';

export const PAGE_EDITOR_HEADING_FOLD_END_STYLE_CLASS = [
  'relative ml-3 inline-flex select-none items-center justify-center align-middle',
  'cursor-pointer text-muted-foreground text-base leading-none hover:text-foreground',
  'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
  "before:absolute before:-inset-3 before:content-['']",
].join(' ');

/** A folded heading keeps its button visible, or it would read as a heading with nothing under it. */
export const PAGE_EDITOR_FOLDED_HEADING_MARK_STYLE_CLASS = 'opacity-100';

export const PAGE_EDITOR_PLACEHOLDER_STYLE_CLASS =
  'relative before:pointer-events-none before:absolute before:text-muted-foreground/60 before:content-[attr(data-placeholder)]';

export const PAGE_EDITOR_BLOCK_PROBE_INSET_PX = 40;

export const PAGE_EDITOR_GUTTER_REACH_PX = 56;

export const PAGE_EDITOR_BLOCK_MENU_PLUGIN_KEY = 'page-editor-block-menu-plugin';

export const PAGE_EDITOR_GRIP_CLICK_TOLERANCE_PX = 4;

export const PAGE_EDITOR_BLOCK_MENU_DROP_PX = 28;

export const PAGE_EDITOR_BLOCK_ARRIVAL_STYLE_CLASSES: readonly string[] = ['ring-2', 'ring-primary', 'ring-offset-2'];

export const PAGE_EDITOR_BLOCK_ARRIVAL_MS = 2500;

export const PAGE_EDITOR_BLOCK_ARRIVAL_WAIT_MS = 5000;

export const PAGE_EDITOR_BLOCK_DRAG_PLUGIN_KEY = 'page-editor-block-drag-plugin';

export const PAGE_EDITOR_IDLE_DRAG_STATE: PageEditorBlockDragState = { placement: null, range: null };

export const PAGE_EDITOR_DROP_INDICATOR_CLASS = 'page-editor-drop-indicator';

export const PAGE_EDITOR_DROP_INDICATOR_STYLE_CLASS = 'pointer-events-none -my-px h-0.5 rounded-full bg-primary';

export const PAGE_EDITOR_DRAGGED_BLOCK_STYLE_CLASS = 'opacity-40';

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

/** Rows include the header. */
export const PAGE_EDITOR_TABLE_SIZE = { columns: 3, rows: 3 } as const;

export const PAGE_EDITOR_TABLE_MINIMUM_CELL_WIDTH = 60;

export const PAGE_EDITOR_TABLE_SCROLL_STYLE_CLASS = 'overflow-x-auto';

export const PAGE_EDITOR_TOGGLE_TYPE = 'toggle';

export const PAGE_EDITOR_CALLOUT_TYPE = 'callout';

export const PAGE_EDITOR_IMAGE_TYPE = 'image';

export const PAGE_EDITOR_VIDEO_TYPE = 'video';

export const PAGE_EDITOR_AUDIO_TYPE = 'audio';

export const PAGE_EDITOR_EMBED_TYPE = 'embed';

export const PAGE_EDITOR_MEDIA_VIDEO_STYLE_CLASS = 'block h-auto w-full max-w-full bg-black';

export const PAGE_EDITOR_MEDIA_FIGURE_STYLE_CLASS = 'my-6 flex flex-col';

/** Full column width when unsized, since a player is a control rather than a picture. */
export const PAGE_EDITOR_MEDIA_UNSIZED_WIDTH = 1;

export const PAGE_EDITOR_MEDIA_PLAYER_STYLE_CLASS = [
  'flex w-full flex-col',
  '[&:fullscreen]:justify-center [&:fullscreen]:bg-black',
  '[&:fullscreen>video]:max-h-screen [&:fullscreen>video]:object-contain',
].join(' ');

export const PAGE_EDITOR_MEDIA_MINUTE = 60;

export const PAGE_EDITOR_MEDIA_TIME_PAD = 2;

export const PAGE_EDITOR_MEDIA_AUDIO_STYLE_CLASS = 'sr-only';

export const PAGE_EDITOR_MEDIA_BAR_STYLE_CLASS =
  'flex w-full items-center gap-3 border border-border bg-surface-low px-3 py-2';

export const PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS = [
  'relative inline-flex size-6 shrink-0 items-center justify-center text-muted-foreground text-sm',
  'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  "before:absolute before:-inset-2.5 before:content-['']",
].join(' ');

export const PAGE_EDITOR_MEDIA_TIME_STYLE_CLASS = 'shrink-0 text-muted-foreground text-xs tabular-nums';

export const PAGE_EDITOR_MEDIA_SEEK_STYLE_CLASS = 'h-1 w-full min-w-0 flex-1 cursor-pointer accent-primary';

/** Seconds; tenths so a short recording is not all or nothing. */
export const PAGE_EDITOR_MEDIA_SEEK_STEP = '0.1';

/** Strokes on a 24 by 24 box, so each icon takes the surrounding text colour. */
export const PAGE_EDITOR_MARKS = {
  copy: ['M9 9h10v10H9z', 'M5 15V5h10'],
  download: ['M12 4v11', 'M8 11l4 4 4-4', 'M5 19h14'],
  fullScreen: ['M9 4H4v5', 'M15 4h5v5', 'M15 20h5v-5', 'M9 20H4v-5'],
  fitToFrame: ['M4 8V4h4', 'M16 4h4v4', 'M20 16v4h-4', 'M8 20H4v-4', 'M9 9h6v6H9z'],
  zoomIn: ['M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14', 'm20 20-4-4', 'M11 8v6', 'M8 11h6'],
  zoomOut: ['M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14', 'm20 20-4-4', 'M8 11h6'],
  pause: ['M9 5v14', 'M15 5v14'],
  play: ['M8 5.5v13l11-6.5z'],
  silent: ['M11 5 6.5 9H3v6h3.5L11 19z', 'm17 10 4 4', 'm21 10-4 4'],
  wrap: ['M4 6h16', 'M4 12h13a3 3 0 0 1 0 6h-3', 'm16 15-2 3 2 3', 'M4 18h4'],
  sound: ['M11 5 6.5 9H3v6h3.5L11 19z', 'M15.5 8.5a5 5 0 0 1 0 7'],
  page: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5', 'M9 13h6', 'M9 17h4'],
} as const satisfies Readonly<Record<string, readonly string[]>>;

export const PAGE_EDITOR_MARK_BOX = '0 0 24 24';

export const PAGE_EDITOR_MARK_WEIGHT = '1.8';

export const PAGE_EDITOR_MARK_STYLE_CLASS = 'size-4';

export const PAGE_EDITOR_FILE_STYLE_CLASS = [
  'my-3 flex min-h-11 items-center gap-3 border border-border bg-surface-low px-3',
  'text-foreground text-sm underline-offset-4 hover:underline',
].join(' ');

export const PAGE_EDITOR_FILE_NAME_STYLE_CLASS = 'min-w-0 flex-1 truncate';

export const PAGE_EDITOR_FILE_ABOUT_STYLE_CLASS = 'shrink-0 text-muted-foreground text-xs tabular-nums';

export const PAGE_EDITOR_FILE_SIZE_STEP = 1024;

export const PAGE_EDITOR_FILE_SIZE_UNITS: readonly string[] = ['B', 'KB', 'MB', 'GB'];

export const PAGE_EDITOR_FILE_TYPE = 'file';

/** The only file kind drawn inline on the page. */
export const PAGE_EDITOR_DOCUMENT_MIME_TYPE = 'application/pdf';

export const PAGE_EDITOR_DOCUMENT_NAME_ENDING = /\.pdf$/i;

export const PAGE_EDITOR_DOCUMENT_ASPECT_RATIO = '768 / 1086';

export const PAGE_EDITOR_DOCUMENT_UNSIZED_WIDTH = 'min(100%, 768px)';

export const PAGE_EDITOR_DOCUMENT_STYLE_CLASS = 'block w-full border border-border bg-surface-low';

export const PAGE_EDITOR_DOCUMENT_BAR_STYLE_CLASS = [
  'flex min-h-11 flex-1 items-center gap-3 text-foreground text-sm underline-offset-4 hover:underline',
].join(' ');

export const PAGE_EDITOR_DOCUMENT_HEAD_STYLE_CLASS =
  'flex w-full items-center gap-3 border border-border border-b-0 bg-surface-low px-3';

export const PAGE_EDITOR_DOCUMENT_FIGURE_STYLE_CLASS = 'my-3 flex flex-col';

export const PAGE_EDITOR_FILE_NAME_ENDING = /\.([a-z0-9]{1,8})$/i;

export const PAGE_EDITOR_FILE_INPUT_SELECTOR = '[data-page-file-input]';

export const PAGE_EDITOR_SUBPAGE_REQUEST_SELECTOR = '[data-page-subpage-request]';

export const PAGE_EDITOR_BLOCK_UNSIZED_WIDTH = 'max-content';

export const PAGE_EDITOR_BLOCK_WIDTH_FRAME_STYLE_CLASS = 'group relative max-w-full';

export const PAGE_EDITOR_BLOCK_MINIMUM_WIDTH = 0.1;

export const PAGE_EDITOR_IMAGE_FIGURE_STYLE_CLASS = 'my-6 flex flex-col gap-2';

export const PAGE_EDITOR_ALIGNABLE_TYPES: readonly string[] = [
  PAGE_EDITOR_AUDIO_TYPE,
  PAGE_EDITOR_EMBED_TYPE,
  PAGE_EDITOR_IMAGE_TYPE,
  PAGE_EDITOR_VIDEO_TYPE,
];

export const PAGE_EDITOR_BLOCK_ALIGN_STYLE_CLASSES: Readonly<Record<string, string>> = {
  center: 'items-center text-center',
  left: 'items-start text-start',
  right: 'items-end text-end',
};

export const PAGE_EDITOR_IMAGE_STYLE_CLASS = 'h-auto w-full max-w-full';

export const PAGE_EDITOR_IMAGE_CAPTION_STYLE_CLASS = [
  'min-h-11 w-full border-none bg-transparent text-muted-foreground text-sm',
  'outline-none focus-visible:ring-0',
].join(' ');

export const PAGE_EDITOR_BLOCK_RESIZE_HANDLE_STYLE_CLASS = [
  'absolute top-1/2 right-0 h-full max-h-16 w-1.5 -translate-y-1/2 cursor-col-resize bg-primary',
  'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
].join(' ');

export const PAGE_EDITOR_CODE_TYPE = 'code_block';

export const PAGE_EDITOR_CONTENTS_TYPE = 'table_of_contents';

export const PAGE_EDITOR_SUBPAGE_TYPE = 'subpage';

export const PAGE_EDITOR_TEXT_COLOR_MARK = 'text_color';

export const PAGE_EDITOR_BACKGROUND_COLOR_MARK = 'background_color';

/** Foreground colour, so it is not mistaken for a link, which is underlined in the link colour. */
export const PAGE_EDITOR_UNDERLINE_STYLE_CLASS = 'underline decoration-foreground/60 underline-offset-4';

export const PAGE_EDITOR_SYNCED_TYPE = 'synced';

export const PAGE_EDITOR_SYNCED_STYLE_CLASS =
  'my-4 flex flex-col gap-2 border-primary/40 border-s-2 bg-surface-low/60 px-4 py-3';

export const PAGE_EDITOR_SYNCED_MARK_STYLE_CLASS =
  'flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wide';

export const PAGE_EDITOR_SYNCED_SOURCE_STYLE_CLASS = 'underline underline-offset-4 hover:text-foreground';

export const PAGE_EDITOR_SYNCED_BODY_STYLE_CLASS = 'min-w-0';

export const PAGE_EDITOR_SYNCED_LOST_STYLE_CLASS = 'text-muted-foreground text-sm italic';

export const PAGE_EDITOR_MENTION_TRIGGER = '@';

export const PAGE_EDITOR_MENTION_REQUEST_SELECTOR = '[data-page-mention-request]';

export const PAGE_EDITOR_MENTION_TITLE_ATTRIBUTE = 'pageMentionTitle';

/** The finder entry that offers to create a page, not an existing one. */
export const PAGE_EDITOR_MENTION_CREATION_ITEM_ID = 'mention-creation';

export const PAGE_EDITOR_MENTION_STYLE_CLASS = [
  'inline-flex items-baseline gap-1 rounded px-0.5 text-primary underline underline-offset-4',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_EDITOR_MENTION_MARK_STYLE_CLASS = 'size-3.5 self-center shrink-0';

export const PAGE_EDITOR_MENTION_TRASHED_STYLE_CLASS = 'text-muted-foreground line-through decoration-1';

export const PAGE_EDITOR_MENTION_TRASHED_TAG_STYLE_CLASS =
  'rounded bg-surface-low px-1 text-[0.6875rem] text-muted-foreground no-underline';

export const PAGE_EDITOR_SUBPAGE_STYLE_CLASS = [
  'group my-1 flex w-full items-center gap-2 rounded px-1 py-1.5 no-underline',
  'font-medium text-foreground transition-colors hover:bg-surface-low',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_EDITOR_SUBPAGE_MARK_STYLE_CLASS = 'size-4 shrink-0 text-muted-foreground';

/** Underlined only on hover: a permanent underline would read as a link to somewhere else. */
export const PAGE_EDITOR_SUBPAGE_NAME_STYLE_CLASS = 'truncate underline-offset-4 group-hover:underline';

export const PAGE_EDITOR_CODE_INDENT = '  ';

export const PAGE_EDITOR_CODE_LEADING_SPACES_PATTERN = /^ +/;

/** Wraps instead of pushing the first control off a narrow screen, and is hidden when printed. */
export const PAGE_EDITOR_CODE_BAR_STYLE_CLASS =
  'mt-6 flex flex-wrap items-center justify-end gap-1 bg-surface-low px-2 pt-2 print:hidden';

/** Options get explicit colours because the browser's list takes the control's, opening white on a dark page. */
export const PAGE_EDITOR_CODE_LANGUAGE_STYLE_CLASS = [
  'me-auto min-h-11 cursor-pointer rounded-none border border-transparent bg-surface-low px-2 text-xs',
  'text-muted-foreground hover:border-border hover:text-foreground',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
  '[&>option]:bg-surface [&>option]:text-foreground',
].join(' ');

export const PAGE_EDITOR_CODE_BUTTON_STYLE_CLASS = [
  'relative inline-flex size-5 shrink-0 items-center justify-center',
  'cursor-pointer select-none text-muted-foreground text-xs hover:text-foreground',
  "before:absolute before:-inset-3 before:content-['']",
].join(' ');

export const PAGE_EDITOR_CODE_WRAPPED_STYLE_CLASS = 'whitespace-pre-wrap';

export const PAGE_EDITOR_CALLOUT_ICON_ATTRIBUTE = 'icon';

export const PAGE_EDITOR_BLOCK_GROUP = 'block';

export const PAGE_EDITOR_COLUMN_ROW_TYPE = 'column_list';

export const PAGE_EDITOR_COLUMN_TYPE = 'column';

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
 * Share of a block's height, top and bottom, that means "new line here". Read before the side bands because
 * the grip is in the left margin, so every drag starts on the left side.
 */
export const PAGE_EDITOR_DROP_EDGE_RATIO = 0.3;

export const PAGE_EDITOR_DROP_EDGE_MIN_PX = 10;

export const PAGE_EDITOR_COLUMN_EDGE_MIN_PX = 44;

export const PAGE_EDITOR_COLUMN_EDGE_RATIO = 0.25;

export const PAGE_EDITOR_COLUMN_EDGE_MAX_PX = 120;

export const PAGE_EDITOR_DROP_COLUMN_LEFT_STYLE_CLASS = '-ml-0.5 border-primary border-l-2';

export const PAGE_EDITOR_DROP_COLUMN_RIGHT_STYLE_CLASS = '-mr-0.5 border-primary border-r-2';

export const PAGE_EDITOR_CALLOUT_CLASS =
  'my-4 flex gap-3 border border-border border-l-4 border-l-primary bg-surface-low px-4 py-3';

export const PAGE_EDITOR_CALLOUT_ICON_STYLE_CLASS = 'shrink-0 select-none text-lg leading-7';

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

export const PAGE_EDITOR_EMBED_YOUTUBE_SHORT_HOST = 'youtu.be';

export const PAGE_EDITOR_EMBED_YOUTUBE_VIDEO = /^\/embed\/([\w-]+)/;

export const PAGE_EDITOR_EMBED_VIMEO_VIDEO = /^\/(?:video\/)?(\d+)/;

/** Loom serves share and embed at the same path with one segment changed. */
export const PAGE_EDITOR_EMBED_LOOM_SHARE = /^\/(share|embed)\/([\w-]+)/;

export const PAGE_EDITOR_EMBED_FIGMA_FRAME = 'https://www.figma.com/embed';

export const PAGE_EDITOR_EMBED_FIGMA_HOST = 'neuma';

export const PAGE_EDITOR_EMBED_ASPECT_RATIOS: Readonly<Record<string, string>> = {
  figma: '4 / 3',
  loom: '16 / 9',
  vimeo: '16 / 9',
  youtube: '16 / 9',
};

export const PAGE_EDITOR_EMBED_FRAME_ALLOW = 'accelerometer; clipboard-write; encrypted-media; picture-in-picture';

export const PAGE_EDITOR_EMBED_FIGURE_STYLE_CLASS = 'my-6 flex flex-col';

export const PAGE_EDITOR_EMBED_FRAME_STYLE_CLASS = 'w-full overflow-hidden border border-border bg-surface-low';

export const PAGE_EDITOR_EMBED_REFUSED_STYLE_CLASS = [
  'my-3 flex min-h-11 flex-wrap items-center gap-2 border border-border border-dashed bg-surface-low px-3 py-2',
  'text-muted-foreground text-sm [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4',
].join(' ');

export const PAGE_EDITOR_BOOKMARK_TYPE = 'bookmark';

/** Outranks the plain link rule: both match `<a href>`, and without it a pasted card became a link. */
export const PAGE_EDITOR_CARD_PARSE_PRIORITY = 60;

export const PAGE_EDITOR_BOOKMARK_STYLE_CLASS = [
  'my-3 flex min-h-11 w-full items-center gap-3 border border-border bg-surface-low px-3 py-2',
  'text-foreground text-sm no-underline hover:bg-surface-container',
].join(' ');

export const PAGE_EDITOR_BOOKMARK_ICON_STYLE_CLASS = 'size-5 shrink-0 rounded-sm';

export const PAGE_EDITOR_BOOKMARK_TEXT_STYLE_CLASS = 'flex min-w-0 flex-1 flex-col';

export const PAGE_EDITOR_BOOKMARK_TITLE_STYLE_CLASS = 'truncate font-medium';

export const PAGE_EDITOR_BOOKMARK_ABOUT_STYLE_CLASS = 'truncate text-muted-foreground text-xs';
