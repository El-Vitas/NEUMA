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
  'audio',
  'bookmark',
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
  'subpage',
  'synced',
  'table_of_contents',
  'text',
  'video',
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

export const PAGE_EDITOR_VIDEO_TYPE = 'video';

export const PAGE_EDITOR_AUDIO_TYPE = 'audio';

export const PAGE_EDITOR_EMBED_TYPE = 'embed';

/** A video nobody has sized plays at the size it came in at; a recording is a line of controls. */
export const PAGE_EDITOR_MEDIA_VIDEO_STYLE_CLASS = 'block h-auto w-full max-w-full bg-black';

/** A video sits in the same kind of frame as an image, so its edge can be taken hold of the same way. */
export const PAGE_EDITOR_MEDIA_FIGURE_STYLE_CLASS = 'my-6 flex flex-col';

/**
 * A player nobody sized takes the whole column of writing: it is a control to
 * be worked, not a picture to be looked at.
 */
export const PAGE_EDITOR_MEDIA_UNSIZED_WIDTH = 1;

/** Taken to the whole screen, the video is what fills it and the controls stay under it. */
export const PAGE_EDITOR_MEDIA_PLAYER_STYLE_CLASS = [
  'flex w-full flex-col',
  '[&:fullscreen]:justify-center [&:fullscreen]:bg-black',
  '[&:fullscreen>video]:max-h-screen [&:fullscreen>video]:object-contain',
].join(' ');

/** Sixty seconds in a minute, and sixty minutes in an hour. */
export const PAGE_EDITOR_MEDIA_MINUTE = 60;

/** Seconds and minutes are said with two digits: 0:07, never 0:7. */
export const PAGE_EDITOR_MEDIA_TIME_PAD = 2;

export const PAGE_EDITOR_MEDIA_AUDIO_STYLE_CLASS = 'sr-only';

/** The controls of a player: drawn here, in the colours of the page, and not by the browser. */
export const PAGE_EDITOR_MEDIA_BAR_STYLE_CLASS =
  'flex w-full items-center gap-3 border border-border bg-surface-low px-3 py-2';

export const PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS = [
  'relative inline-flex size-6 shrink-0 items-center justify-center text-muted-foreground text-sm',
  'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  "before:absolute before:-inset-2.5 before:content-['']",
].join(' ');

/** Where it is and how long it lasts, in figures that do not shift as the seconds pass. */
export const PAGE_EDITOR_MEDIA_TIME_STYLE_CLASS = 'shrink-0 text-muted-foreground text-xs tabular-nums';

export const PAGE_EDITOR_MEDIA_SEEK_STYLE_CLASS = 'h-1 w-full min-w-0 flex-1 cursor-pointer accent-primary';

/** How finely the bar can be moved: tenths of a second, so a short recording is not all or nothing. */
export const PAGE_EDITOR_MEDIA_SEEK_STEP = '0.1';

/**
 * The marks a block is worked by, drawn as strokes on a 24 by 24 square so
 * each one takes the colour of the text around it instead of arriving with a
 * colour of its own, as a letter or an emoji would.
 */
export const PAGE_EDITOR_MARKS = {
  copy: ['M9 9h10v10H9z', 'M5 15V5h10'],
  download: ['M12 4v11', 'M8 11l4 4 4-4', 'M5 19h14'],
  fullScreen: ['M9 4H4v5', 'M15 4h5v5', 'M15 20h5v-5', 'M9 20H4v-5'],
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

/** A file says what it is called, what kind it is and how heavy, on one line that brings it down. */
export const PAGE_EDITOR_FILE_STYLE_CLASS = [
  'my-3 flex min-h-11 items-center gap-3 border border-border bg-surface-low px-3',
  'text-foreground text-sm underline-offset-4 hover:underline',
].join(' ');

export const PAGE_EDITOR_FILE_NAME_STYLE_CLASS = 'min-w-0 flex-1 truncate';

export const PAGE_EDITOR_FILE_ABOUT_STYLE_CLASS = 'shrink-0 text-muted-foreground text-xs tabular-nums';

/** A thousand and twenty-four of one unit is one of the next. */
export const PAGE_EDITOR_FILE_SIZE_STEP = 1024;

export const PAGE_EDITOR_FILE_SIZE_UNITS: readonly string[] = ['B', 'KB', 'MB', 'GB'];

export const PAGE_EDITOR_FILE_TYPE = 'file';

/** The one kind of file a page draws where it stands: a document, read among the writing. */
export const PAGE_EDITOR_DOCUMENT_MIME_TYPE = 'application/pdf';

export const PAGE_EDITOR_DOCUMENT_NAME_ENDING = /\.pdf$/i;

/** A document is drawn on the page it was written for: a sheet of paper standing up. */
export const PAGE_EDITOR_DOCUMENT_ASPECT_RATIO = '768 / 1086';

/** As wide as the sheet it was written for, and never wider than the column it sits in. */
export const PAGE_EDITOR_DOCUMENT_UNSIZED_WIDTH = 'min(100%, 768px)';

/** The document itself, framed like the block it sits in and given room to be read. */
export const PAGE_EDITOR_DOCUMENT_STYLE_CLASS = 'block w-full border border-border bg-surface-low';

/** The line above a document: what it is called, what kind it is, and a way to take it away. */
export const PAGE_EDITOR_DOCUMENT_BAR_STYLE_CLASS = [
  'flex min-h-11 flex-1 items-center gap-3 text-foreground text-sm underline-offset-4 hover:underline',
].join(' ');

/** The name and the way to see the document whole share one line above it. */
export const PAGE_EDITOR_DOCUMENT_HEAD_STYLE_CLASS =
  'flex w-full items-center gap-3 border border-border border-b-0 bg-surface-low px-3';

export const PAGE_EDITOR_DOCUMENT_FIGURE_STYLE_CLASS = 'my-3 flex flex-col';

/** What a file's name ends in: the letters after the last dot, and nothing longer than a kind. */
export const PAGE_EDITOR_FILE_NAME_ENDING = /\.([a-z0-9]{1,8})$/i;

/** Where the page keeps the chooser that answers for every file put on it. */
export const PAGE_EDITOR_FILE_INPUT_SELECTOR = '[data-page-file-input]';

/** Where the page keeps whoever knows how to make another page hang from it. */
export const PAGE_EDITOR_SUBPAGE_REQUEST_SELECTOR = '[data-page-subpage-request]';

/** A block nobody sized hugs whatever it came in at, never stretched to fill the page. */
export const PAGE_EDITOR_BLOCK_UNSIZED_WIDTH = 'max-content';

/** The frame carries the width; the block inside fills it and never spills past the writing. */
export const PAGE_EDITOR_BLOCK_WIDTH_FRAME_STYLE_CLASS = 'group relative max-w-full';

/** Narrower than this a block says nothing, so the edge stops there. */
export const PAGE_EDITOR_BLOCK_MINIMUM_WIDTH = 0.1;

export const PAGE_EDITOR_IMAGE_FIGURE_STYLE_CLASS = 'my-6 flex flex-col gap-2';

/** What can stand somewhere other than the left of the column: what is not writing. */
export const PAGE_EDITOR_ALIGNABLE_TYPES: readonly string[] = [
  PAGE_EDITOR_AUDIO_TYPE,
  PAGE_EDITOR_EMBED_TYPE,
  PAGE_EDITOR_IMAGE_TYPE,
  PAGE_EDITOR_VIDEO_TYPE,
];

/** Where a block stands in the column of writing. */
export const PAGE_EDITOR_BLOCK_ALIGN_STYLE_CLASSES: Readonly<Record<string, string>> = {
  center: 'items-center text-center',
  left: 'items-start text-start',
  right: 'items-end text-end',
};

export const PAGE_EDITOR_IMAGE_STYLE_CLASS = 'h-auto w-full max-w-full';

/** The line under an image: what a reader sees, and what is read out to whoever cannot see it. */
export const PAGE_EDITOR_IMAGE_CAPTION_STYLE_CLASS = [
  'min-h-11 w-full border-none bg-transparent text-muted-foreground text-sm',
  'outline-none focus-visible:ring-0',
].join(' ');

/** The edge a block is stretched by, shown once the pointer is on it. */
export const PAGE_EDITOR_BLOCK_RESIZE_HANDLE_STYLE_CLASS = [
  'absolute top-1/2 right-0 h-full max-h-16 w-1.5 -translate-y-1/2 cursor-col-resize bg-primary',
  'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
].join(' ');

export const PAGE_EDITOR_CODE_TYPE = 'code_block';

/** The block that lists what the page holds, written by the page itself. */
export const PAGE_EDITOR_CONTENTS_TYPE = 'table_of_contents';

/** The block that leads to a page hanging from this one. */
export const PAGE_EDITOR_SUBPAGE_TYPE = 'subpage';

/** What a stretch of painted writing is called, said once so the page and the editor agree on the name. */
export const PAGE_EDITOR_TEXT_COLOR_MARK = 'text_color';

export const PAGE_EDITOR_BACKGROUND_COLOR_MARK = 'background_color';

/** Underlined in the colour of the writing: what is underlined in the colour of a link is a link. */
export const PAGE_EDITOR_UNDERLINE_STYLE_CLASS = 'underline decoration-foreground/60 underline-offset-4';

/** The block that shows a block written in another page. */
export const PAGE_EDITOR_SYNCED_TYPE = 'synced';

/** What is shown of another page's block: set apart, marked as borrowed, and never written in here. */
export const PAGE_EDITOR_SYNCED_STYLE_CLASS =
  'my-4 flex flex-col gap-2 border-primary/40 border-s-2 bg-surface-low/60 px-4 py-3';

export const PAGE_EDITOR_SYNCED_MARK_STYLE_CLASS =
  'flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wide';

export const PAGE_EDITOR_SYNCED_SOURCE_STYLE_CLASS = 'underline underline-offset-4 hover:text-foreground';

export const PAGE_EDITOR_SYNCED_BODY_STYLE_CLASS = 'min-w-0';

/** A block whose page cannot be read from here says so, rather than showing an empty frame. */
export const PAGE_EDITOR_SYNCED_LOST_STYLE_CLASS = 'text-muted-foreground text-sm italic';

/** What is written to start looking for a page already written, wherever the looking was asked for. */
export const PAGE_EDITOR_MENTION_TRIGGER = '@';

/** Where the page keeps whoever knows how to make the page that was named but does not exist yet. */
export const PAGE_EDITOR_MENTION_REQUEST_SELECTOR = '[data-page-mention-request]';

/** Under what name the page being asked for travels from the menu to whoever makes it. */
export const PAGE_EDITOR_MENTION_TITLE_ATTRIBUTE = 'pageMentionTitle';

/** The one entry in the finder that is not a page, because it is the offer to make one. */
export const PAGE_EDITOR_MENTION_CREATION_ITEM_ID = 'mention-creation';

/** A page named in the middle of a sentence: it reads as part of the line, not as a line of its own. */
export const PAGE_EDITOR_MENTION_STYLE_CLASS = [
  'inline-flex items-baseline gap-1 rounded px-0.5 text-primary underline underline-offset-4',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_EDITOR_MENTION_MARK_STYLE_CLASS = 'size-3.5 self-center shrink-0';

/** A page in the writing: the line that leads to it, drawn as a line and not as a card. */
export const PAGE_EDITOR_SUBPAGE_STYLE_CLASS = [
  'group my-1 flex w-full items-center gap-2 rounded px-1 py-1.5 no-underline',
  'font-medium text-foreground transition-colors hover:bg-surface-low',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

/** The mark of a page, drawn rather than written, so it says «page» in any language. */
export const PAGE_EDITOR_SUBPAGE_MARK_STYLE_CLASS = 'size-4 shrink-0 text-muted-foreground';

/**
 * A page started here is named plainly, not underlined: what is underlined in a
 * page is a link to somewhere else, and this one is part of the page itself.
 * The underline arrives when the pointer does, which is when it behaves as one.
 */
export const PAGE_EDITOR_SUBPAGE_NAME_STYLE_CLASS = 'truncate underline-offset-4 group-hover:underline';

/** A step of indentation inside code: two spaces, written as such rather than as a tab. */
export const PAGE_EDITOR_CODE_INDENT = '  ';

/** The controls of a code block sit above it, out of the way of the code itself. */
/**
 * The bar of a block wraps rather than pushing its first control off the side
 * of a narrow screen, and stays off paper, where a control is only ink.
 */
export const PAGE_EDITOR_CODE_BAR_STYLE_CLASS =
  'mt-6 flex flex-wrap items-center justify-end gap-1 bg-surface-low px-2 pt-2 print:hidden';

/**
 * A choice on the bar of a block: quiet until it is looked at, and drawn in the
 * page's own colours — the list a browser opens takes the colours of the
 * control it belongs to, so leaving it transparent is what opens a white list
 * on a dark page.
 */
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

/** Where a video shared as `youtu.be/ID` keeps its name, and where one already framed keeps it. */
export const PAGE_EDITOR_EMBED_YOUTUBE_SHORT_HOST = 'youtu.be';

export const PAGE_EDITOR_EMBED_YOUTUBE_VIDEO = /^\/embed\/([\w-]+)/;

export const PAGE_EDITOR_EMBED_VIMEO_VIDEO = /^\/(?:video\/)?(\d+)/;

/** Loom shares a recording and shows it at the same address with one word changed. */
export const PAGE_EDITOR_EMBED_LOOM_SHARE = /^\/(share|embed)\/([\w-]+)/;

/** Figma draws what it is handed, and asks who is asking. */
export const PAGE_EDITOR_EMBED_FIGMA_HOST = 'https://www.figma.com/embed?embed_host=company-brain&url=';

/** A video sits in the shape it was filmed in; a drawing is given room to be looked at. */
export const PAGE_EDITOR_EMBED_ASPECT_RATIOS: Readonly<Record<string, string>> = {
  figma: '4 / 3',
  loom: '16 / 9',
  vimeo: '16 / 9',
  youtube: '16 / 9',
};

/** What the frame is allowed to do: play, and take the screen if asked. Nothing else. */
export const PAGE_EDITOR_EMBED_FRAME_ALLOW = 'accelerometer; clipboard-write; encrypted-media; picture-in-picture';

export const PAGE_EDITOR_EMBED_FIGURE_STYLE_CLASS = 'my-6 flex flex-col';

export const PAGE_EDITOR_EMBED_FRAME_STYLE_CLASS = 'w-full overflow-hidden border border-border bg-surface-low';

/** A link nothing can be shown of is said plainly, and left as a link. */
export const PAGE_EDITOR_EMBED_REFUSED_STYLE_CLASS = [
  'my-3 flex min-h-11 flex-wrap items-center gap-2 border border-border border-dashed bg-surface-low px-3 py-2',
  'text-muted-foreground text-sm [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4',
].join(' ');

export const PAGE_EDITOR_BOOKMARK_TYPE = 'bookmark';

/** A card: the mark of the site, what it is called, what it says, and where it points. */
export const PAGE_EDITOR_BOOKMARK_STYLE_CLASS = [
  'my-3 flex min-h-11 w-full items-center gap-3 border border-border bg-surface-low px-3 py-2',
  'text-foreground text-sm no-underline hover:bg-surface-container',
].join(' ');

export const PAGE_EDITOR_BOOKMARK_ICON_STYLE_CLASS = 'size-5 shrink-0 rounded-sm';

export const PAGE_EDITOR_BOOKMARK_TEXT_STYLE_CLASS = 'flex min-w-0 flex-1 flex-col';

export const PAGE_EDITOR_BOOKMARK_TITLE_STYLE_CLASS = 'truncate font-medium';

export const PAGE_EDITOR_BOOKMARK_ABOUT_STYLE_CLASS = 'truncate text-muted-foreground text-xs';
