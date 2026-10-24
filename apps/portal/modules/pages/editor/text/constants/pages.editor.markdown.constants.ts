import type { PageEditorMarkdownMarkKind } from '../types/pages.editor.paste.types';

export const PAGE_EDITOR_LINE_BREAK_PATTERN = /\r\n|\r|\n/;

/** The text is `[\s\S]*`, not `.*`: a dot stops at a Unicode line separator and the engine backtracks over spaces. */
export const PAGE_EDITOR_MARKDOWN_HEADING_LINE = /^(#{1,3})\s+([\s\S]*)$/;
export const PAGE_EDITOR_MARKDOWN_BULLET_LINE = /^\s*[-+*]\s+([\s\S]*)$/;
export const PAGE_EDITOR_MARKDOWN_ORDERED_LINE = /^\s*(\d+)\.\s+([\s\S]*)$/;
export const PAGE_EDITOR_MARKDOWN_TASK_LINE = /^\s*\[([ xX]?)]\s+([\s\S]*)$/;
export const PAGE_EDITOR_MARKDOWN_QUOTE_LINE = /^\s*>\s?(.*)$/;
export const PAGE_EDITOR_MARKDOWN_DIVIDER_LINE = /^---$/;
export const PAGE_EDITOR_MARKDOWN_CODE_FENCE_LINE = /^```([\w-]+)?\s*$/;

export const PAGE_EDITOR_MARKDOWN_LINK_INLINE = /\[([^[\]]+)]\((https?:\/\/[^\s)]+)\)/;
export const PAGE_EDITOR_MARKDOWN_BOLD_INLINE = /\*\*([^*]+)\*\*/;
export const PAGE_EDITOR_MARKDOWN_CODE_INLINE = /`([^`]+)`/;
export const PAGE_EDITOR_MARKDOWN_STRIKE_INLINE = /~~([^~]+)~~/;
/** Single asterisks only: `**` is bold and must not match as two italics. */
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
