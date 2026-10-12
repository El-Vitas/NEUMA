import type { PageEditorFindState } from '../types/pages.editor.find.types';

export const PAGE_EDITOR_FIND_REQUEST_SELECTOR = '[data-page-find-request]';

export const PAGE_EDITOR_FIND_PLUGIN_KEY = 'page-editor-find';

export const PAGE_EDITOR_FIND_INITIAL_STATE: PageEditorFindState = { currentIndex: null, matches: [], query: '' };

export const PAGE_EDITOR_FIND_MATCH_STYLE_CLASS = 'rounded-sm bg-yellow-200 dark:bg-yellow-500/30';

export const PAGE_EDITOR_FIND_CURRENT_MATCH_STYLE_CLASS =
  'rounded-sm bg-orange-400 text-foreground dark:bg-orange-500/70';

/** Carries no width of its own: the wrapper that places it already bounds it to the editor. */
export const PAGE_EDITOR_FIND_PANEL_STYLE_CLASS = [
  'flex w-full flex-col gap-1 border border-border bg-surface p-2 shadow-lg',
].join(' ');

export const PAGE_EDITOR_FIND_ROW_STYLE_CLASS = 'flex items-center gap-1';

export const PAGE_EDITOR_FIND_REPLACE_ACTIONS_ROW_STYLE_CLASS = 'flex flex-wrap items-center justify-end gap-1';

export const PAGE_EDITOR_FIND_INPUT_STYLE_CLASS = [
  'min-h-11 w-full min-w-0 border border-border bg-surface px-2 text-foreground text-sm',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_EDITOR_FIND_ACTION_STYLE_CLASS = [
  'flex size-11 shrink-0 items-center justify-center text-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-40',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_EDITOR_FIND_REPLACE_ACTION_STYLE_CLASS = [
  'min-h-11 shrink-0 border border-border px-2 text-foreground text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-40',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_EDITOR_FIND_COUNT_STYLE_CLASS =
  'shrink-0 whitespace-nowrap text-muted-foreground text-xs tabular-nums';
