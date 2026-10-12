import type { KatexOptions } from 'katex';

export const PAGE_EDITOR_FORMULA_KATEX_OPTIONS: KatexOptions = {
  displayMode: false,
  output: 'htmlAndMathml',
  trust: false,
};

export const PAGE_EDITOR_FORMULA_STYLE_CLASS = 'inline-block align-middle text-[1em] leading-none';

export const PAGE_EDITOR_FORMULA_EMPTY_STYLE_CLASS =
  'inline-flex items-center rounded border border-border border-dashed px-1.5 text-muted-foreground text-xs italic';

export const PAGE_EDITOR_FORMULA_UNREADABLE_STYLE_CLASS =
  'inline-block align-middle rounded border border-destructive/60 border-dashed px-1 font-mono text-[0.85em] text-destructive leading-none';

export const PAGE_EDITOR_FORMULA_EDITOR_STYLE_CLASS = 'inline-flex items-center gap-2 align-middle';

export const PAGE_EDITOR_FORMULA_FIELD_STYLE_CLASS = [
  'min-h-11 min-w-32 rounded border border-border bg-surface px-2 font-mono text-foreground text-sm',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');

export const PAGE_EDITOR_FORMULA_HELP_STYLE_CLASS = 'text-muted-foreground text-xs';

export const PAGE_EDITOR_FORMULA_DONE_STYLE_CLASS = [
  'inline-flex min-h-11 cursor-pointer items-center rounded border border-border bg-surface-container px-3',
  'font-medium text-foreground text-xs hover:bg-muted',
  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
].join(' ');
