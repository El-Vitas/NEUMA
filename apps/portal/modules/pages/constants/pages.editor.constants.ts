import { Braces, ChevronRight, Heading, List, ListOrdered, type LucideIcon, Quote, Table } from 'lucide-react';
import { createPageEditorCommands } from '../lib/pages.editor.commands';
import { pageEditorSchema } from '../lib/pages.editor.schema';

import type { PageEditorCommandGroup } from '../types/pages.types';

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
  heading: Heading,
  orderedList: ListOrdered,
  table: Table,
  toggle: ChevronRight,
};

export const PAGE_EDITOR_PRIMARY_COMMAND_NAMES = ['bold', 'italic', 'code', 'heading'] as const;

export const SELECTION_TOOLBAR_ESTIMATED_HEIGHT_PX = 44;

export const SELECTION_TOOLBAR_ESTIMATED_WIDTH_PX = 220;

export const SELECTION_TOOLBAR_VERTICAL_GAP_PX = 8;

export const SELECTION_TOOLBAR_HORIZONTAL_MARGIN_PX = 8;

export const PAGE_EDITOR_SURFACE_CLASS_NAME = [
  'relative',
  '[&_.ProseMirror]:min-h-96 [&_.ProseMirror]:w-full [&_.ProseMirror]:text-foreground [&_.ProseMirror]:outline-none',
  '[&_.ProseMirror_p]:mb-4 [&_.ProseMirror_p]:leading-[1.7]',
  '[&_.ProseMirror_h1]:mt-8 [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:font-display [&_.ProseMirror_h1]:text-4xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:leading-none sm:[&_.ProseMirror_h1]:text-5xl',
  '[&_.ProseMirror_h2]:mt-8 [&_.ProseMirror_h2]:mb-4 [&_.ProseMirror_h2]:font-display [&_.ProseMirror_h2]:text-3xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:leading-none sm:[&_.ProseMirror_h2]:text-4xl',
  '[&_.ProseMirror_h3]:mt-8 [&_.ProseMirror_h3]:mb-4 [&_.ProseMirror_h3]:font-display [&_.ProseMirror_h3]:text-2xl [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_h3]:leading-none sm:[&_.ProseMirror_h3]:text-3xl',
  '[&_.ProseMirror_ul]:mb-4 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ps-6',
  '[&_.ProseMirror_ol]:mb-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ps-6',
  '[&_.ProseMirror_blockquote]:my-6 [&_.ProseMirror_blockquote]:border-primary [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:ps-4 [&_.ProseMirror_blockquote]:text-muted-foreground',
  '[&_.ProseMirror_pre]:my-6 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:bg-surface-low [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-sm [&_.ProseMirror_pre]:leading-relaxed',
  '[&_.ProseMirror_table]:my-6 [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:table-fixed [&_.ProseMirror_table]:border-collapse [&_.ProseMirror>table_td]:min-w-0 [&_.ProseMirror>table_td]:border [&_.ProseMirror>table_td]:border-border [&_.ProseMirror>table_td]:p-3 [&_.ProseMirror>table_td]:align-top [&_.ProseMirror>table_td]:wrap-break-word',
  '[&_.ProseMirror_details]:my-4 [&_.ProseMirror_details]:border [&_.ProseMirror_details]:border-border [&_.ProseMirror_details]:px-4 [&_.ProseMirror_details]:py-3 [&_.ProseMirror_summary]:cursor-pointer [&_.ProseMirror_summary]:font-semibold',
  '[&_.ProseMirror_.ProseMirror-selectednode]:bg-primary/10 [&_.ProseMirror_.ProseMirror-selectednode]:outline [&_.ProseMirror_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror_.ProseMirror-selectednode]:outline-primary/40 [&_.ProseMirror_.ProseMirror-selectednode]:outline-offset-2',
  '[&_.ProseMirror_img]:my-6 [&_.ProseMirror_img]:block [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_[data-page-embed]]:my-6 [&_.ProseMirror_[data-page-embed]]:block [&_.ProseMirror_[data-page-embed]]:max-w-full [&_.ProseMirror_[data-page-file]]:my-6 [&_.ProseMirror_[data-page-file]]:block [&_.ProseMirror_[data-page-file]]:max-w-full',
].join(' ');

export const PAGE_EDITOR_COMMANDS = createPageEditorCommands(pageEditorSchema, DEFAULT_PAGE_TOGGLE_SUMMARY);
