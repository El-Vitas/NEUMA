/** The block that writes what it holds when it is pressed. */
export const PAGE_EDITOR_BUTTON_TYPE = 'button';

/** A button on a page: set apart from the writing, but not shouting. */
export const PAGE_EDITOR_BUTTON_STYLE_CLASS = 'my-4 flex flex-col gap-2';

export const PAGE_EDITOR_BUTTON_HEAD_STYLE_CLASS = 'flex flex-wrap items-center gap-2';

/** What is pressed: a real button, sized so a finger finds it. */
export const PAGE_EDITOR_BUTTON_PRESS_STYLE_CLASS = [
  'inline-flex min-h-11 cursor-pointer items-center border border-border bg-surface-container px-4',
  'font-medium text-foreground text-sm transition-colors hover:bg-muted',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

/** How it is set up is asked for, not shown: a page of buttons showing their workings is a page of machinery. */
export const PAGE_EDITOR_BUTTON_SETUP_STYLE_CLASS = [
  'inline-flex min-h-11 cursor-pointer items-center px-2 text-muted-foreground text-xs uppercase tracking-wide',
  'transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_EDITOR_BUTTON_PANEL_STYLE_CLASS =
  'flex flex-col gap-2 border-border border-s bg-surface-low px-4 py-3';

export const PAGE_EDITOR_BUTTON_FIELD_STYLE_CLASS = [
  'min-h-11 border border-border bg-surface px-2 text-foreground text-sm',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

/** What the button writes, written into it like anything else on the page. */
export const PAGE_EDITOR_BUTTON_TEMPLATE_STYLE_CLASS = 'min-w-0';
