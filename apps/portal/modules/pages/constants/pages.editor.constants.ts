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
  '[&_.ProseMirror>p]:mb-4 [&_.ProseMirror>p]:max-w-[72ch] [&_.ProseMirror>p]:leading-[1.7]',
  '[&_.ProseMirror>h1]:mt-8 [&_.ProseMirror>h1]:mb-4 [&_.ProseMirror>h1]:max-w-[72ch] [&_.ProseMirror>h1]:font-display [&_.ProseMirror>h1]:text-4xl [&_.ProseMirror>h1]:font-bold [&_.ProseMirror>h1]:leading-none sm:[&_.ProseMirror>h1]:text-5xl',
  '[&_.ProseMirror>h2]:mt-8 [&_.ProseMirror>h2]:mb-4 [&_.ProseMirror>h2]:max-w-[72ch] [&_.ProseMirror>h2]:font-display [&_.ProseMirror>h2]:text-3xl [&_.ProseMirror>h2]:font-bold [&_.ProseMirror>h2]:leading-none sm:[&_.ProseMirror>h2]:text-4xl',
  '[&_.ProseMirror>h3]:mt-8 [&_.ProseMirror>h3]:mb-4 [&_.ProseMirror>h3]:max-w-[72ch] [&_.ProseMirror>h3]:font-display [&_.ProseMirror>h3]:text-2xl [&_.ProseMirror>h3]:font-bold [&_.ProseMirror>h3]:leading-none sm:[&_.ProseMirror>h3]:text-3xl',
  '[&_.ProseMirror>ul]:mb-4 [&_.ProseMirror>ul]:max-w-[72ch] [&_.ProseMirror>ul]:list-disc [&_.ProseMirror>ul]:ps-6',
  '[&_.ProseMirror>ol]:mb-4 [&_.ProseMirror>ol]:max-w-[72ch] [&_.ProseMirror>ol]:list-decimal [&_.ProseMirror>ol]:ps-6',
  '[&_.ProseMirror>blockquote]:my-6 [&_.ProseMirror>blockquote]:max-w-[72ch] [&_.ProseMirror>blockquote]:border-primary [&_.ProseMirror>blockquote]:border-l-2 [&_.ProseMirror>blockquote]:ps-4 [&_.ProseMirror>blockquote]:text-muted-foreground',
  '[&_.ProseMirror>pre]:my-6 [&_.ProseMirror>pre]:overflow-x-auto [&_.ProseMirror>pre]:bg-surface-low [&_.ProseMirror>pre]:p-4 [&_.ProseMirror>pre]:font-mono [&_.ProseMirror>pre]:text-sm [&_.ProseMirror>pre]:leading-relaxed',
  '[&_.ProseMirror>table]:my-6 [&_.ProseMirror>table]:w-full [&_.ProseMirror>table]:table-fixed [&_.ProseMirror>table]:border-collapse [&_.ProseMirror>table_td]:min-w-0 [&_.ProseMirror>table_td]:border [&_.ProseMirror>table_td]:border-border [&_.ProseMirror>table_td]:p-3 [&_.ProseMirror>table_td]:align-top [&_.ProseMirror>table_td]:wrap-break-word',
  '[&_.ProseMirror>details]:my-4 [&_.ProseMirror>details]:max-w-[72ch] [&_.ProseMirror>details]:border [&_.ProseMirror>details]:border-border [&_.ProseMirror>details]:px-4 [&_.ProseMirror>details]:py-3 [&_.ProseMirror>summary]:cursor-pointer [&_.ProseMirror>summary]:font-semibold',
  '[&_.ProseMirror_.ProseMirror-selectednode]:bg-primary/10 [&_.ProseMirror_.ProseMirror-selectednode]:outline [&_.ProseMirror_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror_.ProseMirror-selectednode]:outline-primary/40 [&_.ProseMirror_.ProseMirror-selectednode]:outline-offset-2',
  '[&_.ProseMirror>img]:my-6 [&_.ProseMirror>img]:block [&_.ProseMirror>img]:max-w-full [&_.ProseMirror>[data-page-embed]]:my-6 [&_.ProseMirror>[data-page-embed]]:block [&_.ProseMirror>[data-page-embed]]:max-w-full [&_.ProseMirror>[data-page-file]]:my-6 [&_.ProseMirror>[data-page-file]]:block [&_.ProseMirror>[data-page-file]]:max-w-full',
].join(' ');

export const PAGE_EDITOR_COMMANDS = createPageEditorCommands(pageEditorSchema, DEFAULT_PAGE_TOGGLE_SUMMARY);
