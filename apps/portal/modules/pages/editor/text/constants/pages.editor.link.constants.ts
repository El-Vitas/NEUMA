export const PAGE_EDITOR_LINK_REQUEST_SELECTOR = '[data-page-link-request]';

export const PAGE_EDITOR_LINK_FIELD_STYLE_CLASS = [
  'flex w-80 max-w-[90vw] flex-col gap-1 border border-border bg-surface p-2 shadow-lg',
].join(' ');

export const PAGE_EDITOR_LINK_INPUT_STYLE_CLASS = [
  'min-h-11 w-full border border-border bg-surface px-2 text-foreground text-sm',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_EDITOR_LINK_CANDIDATE_STYLE_CLASS = [
  'min-h-11 w-full px-2 text-start text-foreground text-sm hover:bg-muted',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_EDITOR_LINK_FAULT_STYLE_CLASS = 'px-2 text-destructive text-xs';

export const PAGE_EDITOR_LINK_BUBBLE_GAP_PX = 4;

export const PAGE_EDITOR_LINK_BUBBLE_STYLE_CLASS = [
  'flex max-w-80 items-center gap-1 border border-border bg-surface-container p-1 shadow-lg',
].join(' ');

export const PAGE_EDITOR_LINK_BUBBLE_TARGET_STYLE_CLASS = [
  'flex min-h-11 min-w-0 flex-1 items-center gap-1 px-2 text-foreground text-sm',
  'outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_EDITOR_LINK_BUBBLE_ACTION_STYLE_CLASS = [
  'flex size-11 shrink-0 items-center justify-center text-foreground hover:bg-muted',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');
