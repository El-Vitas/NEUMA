import type { PageEditorMarkdownMarkKind } from '../types/pages.editor.paste.types';

/** Any of the three ways a line can end, so text copied from any system splits the same. */
export const PAGE_EDITOR_LINE_BREAK_PATTERN = /\r\n|\r|\n/;

export const PAGE_EDITOR_MARKDOWN_HEADING_LINE = /^(#{1,3})\s+(.*)$/;
export const PAGE_EDITOR_MARKDOWN_BULLET_LINE = /^\s*[-+*]\s+(.*)$/;
export const PAGE_EDITOR_MARKDOWN_ORDERED_LINE = /^\s*(\d+)\.\s+(.*)$/;
export const PAGE_EDITOR_MARKDOWN_TASK_LINE = /^\s*\[([ xX]?)]\s+(.*)$/;
export const PAGE_EDITOR_MARKDOWN_QUOTE_LINE = /^\s*>\s?(.*)$/;
export const PAGE_EDITOR_MARKDOWN_DIVIDER_LINE = /^---$/;
export const PAGE_EDITOR_MARKDOWN_CODE_FENCE_LINE = /^```([\w-]+)?\s*$/;

export const PAGE_EDITOR_MARKDOWN_LINK_INLINE = /\[([^[\]]+)]\((https?:\/\/[^\s)]+)\)/;
export const PAGE_EDITOR_MARKDOWN_BOLD_INLINE = /\*\*([^*]+)\*\*/;
export const PAGE_EDITOR_MARKDOWN_CODE_INLINE = /`([^`]+)`/;
export const PAGE_EDITOR_MARKDOWN_STRIKE_INLINE = /~~([^~]+)~~/;
/** One asterisk, and not the second of a pair: `**` is bold and must not be read as italic twice. */
export const PAGE_EDITOR_MARKDOWN_ITALIC_INLINE = /(?<!\*)\*([^*]+)\*(?!\*)/;

export const PAGE_EDITOR_MARKDOWN_MARK_NAMES: Readonly<Record<PageEditorMarkdownMarkKind, string>> = {
  code: 'code',
  em: 'em',
  link: 'link',
  strike: 'strike',
  strong: 'strong',
};

export const PAGE_EDITOR_MARKDOWN_INLINE_PATTERNS: readonly {
  readonly kind: PageEditorMarkdownMarkKind;
  readonly pattern: RegExp;
}[] = [
  { kind: 'link', pattern: PAGE_EDITOR_MARKDOWN_LINK_INLINE },
  { kind: 'strong', pattern: PAGE_EDITOR_MARKDOWN_BOLD_INLINE },
  { kind: 'code', pattern: PAGE_EDITOR_MARKDOWN_CODE_INLINE },
  { kind: 'strike', pattern: PAGE_EDITOR_MARKDOWN_STRIKE_INLINE },
  { kind: 'em', pattern: PAGE_EDITOR_MARKDOWN_ITALIC_INLINE },
];
