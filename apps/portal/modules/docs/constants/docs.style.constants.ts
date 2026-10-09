import { DIAGRAM_MENDED_STYLE_CLASS } from '@/shared/constants/diagram.constants';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';

export const DOCS_ICON_SIZE = 32;
export const DOCS_ORDINARY_ICON_SIDE = 24;

export const DOCS_MARKDOWN_STYLE_CLASS = [
  'space-y-4 text-muted-foreground text-sm/relaxed',
  '[&_h2]:mt-10 [&_h2]:scroll-mt-24 [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:text-xl',
  '[&_h3]:mt-8 [&_h3]:scroll-mt-24 [&_h3]:font-semibold [&_h3]:text-base [&_h3]:text-foreground',
  '[&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:ps-5',
  '[&_strong]:font-semibold [&_strong]:text-foreground',
  '[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4',
  '[&_table]:border [&_table]:border-border [&_td]:border [&_td]:border-border [&_td]:p-2',
  '[&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:text-start [&_th]:text-foreground',
  '[&_pre]:overflow-auto [&_pre]:border [&_pre]:border-border [&_pre]:bg-surface-low [&_pre]:p-3',
  '[&_pre]:font-mono [&_pre]:text-xs',
  '[&_blockquote]:border-border [&_blockquote]:border-s-2 [&_blockquote]:ps-4',
].join(' ');

export const DOCS_INLINE_CODE_STYLE_CLASS = 'border border-border bg-surface-low px-1 py-0.5 font-mono text-xs';

export const DOCS_WRITING_STYLE_CLASS =
  'overflow-auto border border-border bg-surface-low p-3 font-mono text-muted-foreground text-xs leading-relaxed';

export const DOCS_DRAWING_STYLE_CLASS = [
  'flex items-center overflow-auto border border-border bg-surface-low p-3',
  '[justify-content:safe_center] [&_svg]:h-auto [&_svg]:max-w-none [&_svg]:shrink-0',
  DIAGRAM_MENDED_STYLE_CLASS,
].join(' ');

export const DOCS_SIZE_BUTTON_STYLE_CLASS = [
  'inline-flex min-h-11 min-w-11 items-center justify-center',
  'border border-border bg-surface px-2 py-1 text-muted-foreground text-xs',
  'transition-colors hover:text-foreground',
  FOCUS_RING_CLASS,
].join(' ');

export const DOCS_ZOOM_ICON_SIZE = 14;

export const DOCS_ICON_STYLE_CLASS = 'flex flex-col items-center gap-2 border border-border bg-surface-low p-3';

export const DOCS_ICON_NAME_STYLE_CLASS = 'font-mono text-[0.7rem] text-muted-foreground';

export const DOCS_CONTENTS_STYLE_CLASS = [
  'space-y-2 border-border border-s ps-4 text-sm',
  'max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain',
].join(' ');

export const DOCS_CONTENTS_TITLE_STYLE_CLASS = 'font-semibold text-foreground text-xs uppercase tracking-wide';

export const DOCS_CONTENTS_LINK_STYLE_CLASS = 'block text-muted-foreground transition-colors hover:text-foreground';

export const DOCS_CONTENTS_READING_STYLE_CLASS = 'block font-medium text-foreground';

export const DOCS_ARTICLE_LAYOUT_STYLE_CLASS = 'gap-12 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start';

export const DOCS_READING_WIDTH_STYLE_CLASS = 'min-w-0 max-w-3xl';

export const DOCS_FORMULA_STYLE_CLASS =
  'flex justify-center overflow-auto border border-border bg-surface-low p-4 text-foreground';
