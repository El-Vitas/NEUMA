import {
  Braces,
  ChevronRight,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  type LucideIcon,
  Quote,
  Sigma,
  Table,
  Workflow,
} from 'lucide-react';
import { createPageEditorCommands } from '../lib/pages.editor.commands';
import { pageEditorSchema } from '../lib/pages.editor.schema';

import type { PageEditorCommandGroup } from '../types/pages.types';
import { PAGE_EDITOR_BACKGROUND_COLOR_CLASSES, PAGE_EDITOR_TEXT_COLOR_CLASSES } from './pages.editor.colors.constants';

export const DEFAULT_PAGE_TOGGLE_SUMMARY = 'Toggle';

export const PAGE_EDITOR_COMMAND_GROUP_ORDER: readonly PageEditorCommandGroup[] = [
  'recent',
  'text',
  'lists',
  'media',
  'advanced',
];

export const PAGE_EDITOR_COMMAND_ICONS: Readonly<Record<string, LucideIcon>> = {
  blockquote: Quote,
  bulletList: List,
  codeBlock: Braces,
  diagram: Workflow,
  formula: Sigma,
  heading1: Heading1,
  heading2: Heading2,
  heading3: Heading3,
  orderedList: ListOrdered,
  table: Table,
  toggle: ChevronRight,
};

export const PAGE_EDITOR_PRIMARY_COMMAND_NAMES = ['bold', 'italic', 'code', 'heading2'] as const;

export const PAGE_EDITOR_APPLE_USER_AGENT_PATTERN = /mac|iphone|ipad|ipod/i;

export const SELECTION_TOOLBAR_ESTIMATED_HEIGHT_PX = 44;

export const SELECTION_TOOLBAR_ESTIMATED_WIDTH_PX = 220;

export const SELECTION_TOOLBAR_VERTICAL_GAP_PX = 8;

export const SELECTION_TOOLBAR_HORIZONTAL_MARGIN_PX = 8;

export const PAGE_EDITOR_SURFACE_CLASS_NAME = [
  'relative',
  '[&_.ProseMirror]:min-h-96 [&_.ProseMirror]:w-full [&_.ProseMirror]:text-foreground [&_.ProseMirror]:outline-none',
  '[&_.ProseMirror_p]:mb-4 [&_.ProseMirror_p]:leading-[1.7]',
  '[&_.ProseMirror_h1]:mt-8 [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:leading-tight sm:[&_.ProseMirror_h1]:text-4xl',
  '[&_.ProseMirror_h2]:mt-8 [&_.ProseMirror_h2]:mb-4 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:leading-tight sm:[&_.ProseMirror_h2]:text-3xl',
  '[&_.ProseMirror_h3]:mt-8 [&_.ProseMirror_h3]:mb-4 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_h3]:leading-tight sm:[&_.ProseMirror_h3]:text-2xl',
  '[&_.ProseMirror_ul]:mb-4 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ps-6',
  '[&_.ProseMirror_ol]:mb-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ps-6',
  /** A nested level reads as one by its own mark, and sits against the level that holds it. */
  '[&_.ProseMirror_li_ul]:mb-0 [&_.ProseMirror_li_ul]:list-[circle] [&_.ProseMirror_li_ul_ul]:list-[square]',
  '[&_.ProseMirror_li_ol]:mb-0 [&_.ProseMirror_li_ol]:list-[lower-alpha] [&_.ProseMirror_li_ol_ol]:list-[lower-roman]',
  /** A task done is crossed out on its own line, never on the tasks hanging from it. */
  '[&_.ProseMirror_li[data-checked]>div>p]:text-muted-foreground [&_.ProseMirror_li[data-checked]>div>p]:line-through',
  '[&_.ProseMirror_hr]:my-6 [&_.ProseMirror_hr]:border-border [&_.ProseMirror_hr]:border-t',
  /**
   * A link written among the words looks like one. The blocks that are a link
   * whole — a card, a document, a page started here — draw themselves and are
   * left alone.
   */
  '[&_.ProseMirror_a:not([data-page-bookmark]):not([data-page-file]):not([data-page-subpage]):not([data-page-collection]_a)]:text-primary',
  '[&_.ProseMirror_a:not([data-page-bookmark]):not([data-page-file]):not([data-page-subpage]):not([data-page-collection]_a)]:underline',
  '[&_.ProseMirror_a:not([data-page-bookmark]):not([data-page-file]):not([data-page-subpage]):not([data-page-collection]_a)]:underline-offset-4',
  '[&_.ProseMirror_a:not([data-page-bookmark]):not([data-page-file]):not([data-page-subpage]):not([data-page-collection]_a)]:decoration-primary/50',
  '[&_.ProseMirror_a:not([data-page-bookmark]):not([data-page-file]):not([data-page-subpage]):not([data-page-collection]_a)]:hover:decoration-primary',
  /** The code sits right under the bar that describes it, as one block and not two. */
  '[&_.ProseMirror_[data-code-block]_pre]:mt-0',
  '[&_.ProseMirror_blockquote]:my-6 [&_.ProseMirror_blockquote]:border-primary [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:ps-4 [&_.ProseMirror_blockquote]:text-muted-foreground',
  '[&_.ProseMirror_pre]:my-6 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:bg-surface-low [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-sm [&_.ProseMirror_pre]:leading-relaxed',
  /**
   * A table has to read as a grid: every cell walled, the header row set apart,
   * and no paragraph inside a cell carrying the spacing meant for a page.
   *
   * This is the page's own table. A collection drawn inside the writing brings
   * its own, which is laid out by what it holds rather than by columns somebody
   * dragged, so it is left alone.
   */
  '[&_.ProseMirror_table:not([data-page-collection]_table)]:my-6 [&_.ProseMirror_table:not([data-page-collection]_table)]:w-full [&_.ProseMirror_table:not([data-page-collection]_table)]:table-fixed [&_.ProseMirror_table:not([data-page-collection]_table)]:border-collapse',
  /** A column narrower than this cannot be read, so the table outgrows its box and scrolls there. */
  '[&_.ProseMirror_td:not([data-page-collection]_td)]:relative [&_.ProseMirror_td:not([data-page-collection]_td)]:min-w-32 [&_.ProseMirror_td:not([data-page-collection]_td)]:border [&_.ProseMirror_td:not([data-page-collection]_td)]:border-border [&_.ProseMirror_td:not([data-page-collection]_td)]:p-2 [&_.ProseMirror_td:not([data-page-collection]_td)]:align-top [&_.ProseMirror_td:not([data-page-collection]_td)]:wrap-break-word',
  '[&_.ProseMirror_th:not([data-page-collection]_th)]:relative [&_.ProseMirror_th:not([data-page-collection]_th)]:min-w-32 [&_.ProseMirror_th:not([data-page-collection]_th)]:border [&_.ProseMirror_th:not([data-page-collection]_th)]:border-border [&_.ProseMirror_th:not([data-page-collection]_th)]:bg-surface-low [&_.ProseMirror_th:not([data-page-collection]_th)]:p-2 [&_.ProseMirror_th:not([data-page-collection]_th)]:text-start [&_.ProseMirror_th:not([data-page-collection]_th)]:align-top [&_.ProseMirror_th:not([data-page-collection]_th)]:font-semibold [&_.ProseMirror_th:not([data-page-collection]_th)]:wrap-break-word',
  '[&_.ProseMirror_td:not([data-page-collection]_td)>p]:mb-0 [&_.ProseMirror_th:not([data-page-collection]_th)>p]:mb-0',
  /** The cells a gesture is aimed at, and the edge a column is stretched by. */
  '[&_.ProseMirror_.selectedCell]:bg-primary/10',
  '[&_.ProseMirror_.column-resize-handle]:pointer-events-none [&_.ProseMirror_.column-resize-handle]:absolute [&_.ProseMirror_.column-resize-handle]:top-0 [&_.ProseMirror_.column-resize-handle]:bottom-0 [&_.ProseMirror_.column-resize-handle]:-right-0.5 [&_.ProseMirror_.column-resize-handle]:z-20 [&_.ProseMirror_.column-resize-handle]:w-1 [&_.ProseMirror_.column-resize-handle]:bg-primary',
  '[&_.ProseMirror.resize-cursor]:cursor-col-resize',
  '[&_.ProseMirror_details]:my-4 [&_.ProseMirror_details]:border [&_.ProseMirror_details]:border-border [&_.ProseMirror_details]:px-4 [&_.ProseMirror_details]:py-3 [&_.ProseMirror_summary]:cursor-pointer [&_.ProseMirror_summary]:font-semibold',
  '[&_.ProseMirror_.ProseMirror-selectednode]:bg-primary/10 [&_.ProseMirror_.ProseMirror-selectednode]:outline [&_.ProseMirror_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror_.ProseMirror-selectednode]:outline-primary/40 [&_.ProseMirror_.ProseMirror-selectednode]:outline-offset-2',
  '[&_.ProseMirror_img]:my-6 [&_.ProseMirror_img]:block [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_[data-page-embed]]:my-6 [&_.ProseMirror_[data-page-embed]]:block [&_.ProseMirror_[data-page-embed]]:max-w-full [&_.ProseMirror_[data-page-file]]:my-6 [&_.ProseMirror_[data-page-file]]:block [&_.ProseMirror_[data-page-file]]:max-w-full',
  ...PAGE_EDITOR_TEXT_COLOR_CLASSES,
  ...PAGE_EDITOR_BACKGROUND_COLOR_CLASSES,
].join(' ');

export const PAGE_EDITOR_COMMANDS = createPageEditorCommands(pageEditorSchema, DEFAULT_PAGE_TOGGLE_SUMMARY);
