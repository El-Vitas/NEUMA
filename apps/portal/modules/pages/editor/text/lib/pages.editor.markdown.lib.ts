import { PAGE_CODE_LANGUAGES } from '@company-brain/shared';
import type { Node as EditorNode, Mark, Schema } from 'prosemirror-model';
import {
  PAGE_EDITOR_LINE_BREAK_PATTERN,
  PAGE_EDITOR_MARKDOWN_BULLET_LINE,
  PAGE_EDITOR_MARKDOWN_CODE_FENCE_LINE,
  PAGE_EDITOR_MARKDOWN_DIVIDER_LINE,
  PAGE_EDITOR_MARKDOWN_HEADING_LINE,
  PAGE_EDITOR_MARKDOWN_INLINE_PATTERNS,
  PAGE_EDITOR_MARKDOWN_MARK_NAMES,
  PAGE_EDITOR_MARKDOWN_ORDERED_LINE,
  PAGE_EDITOR_MARKDOWN_QUOTE_LINE,
  PAGE_EDITOR_MARKDOWN_TASK_LINE,
} from '../constants/pages.editor.markdown.constants';
import type {
  PageEditorMarkdownGroup,
  PageEditorMarkdownInlineMatch,
  PageEditorMarkdownLineMatcher,
} from '../types/pages.editor.paste.types';

const findEarliestInlineMatch = (text: string): PageEditorMarkdownInlineMatch | null =>
  PAGE_EDITOR_MARKDOWN_INLINE_PATTERNS.reduce<PageEditorMarkdownInlineMatch | null>((earliest, { kind, pattern }) => {
    const match = pattern.exec(text);
    if (match === null || (earliest !== null && match.index >= earliest.index)) return earliest;
    return { index: match.index, kind, label: match[1], length: match[0].length, url: match[2] ?? null };
  }, null);

const readPageEditorMarkdownMark = (schema: Schema, found: PageEditorMarkdownInlineMatch): Mark | null => {
  if (found.kind === 'link') return found.url === null ? null : schema.marks.link.create({ href: found.url });
  return schema.marks[PAGE_EDITOR_MARKDOWN_MARK_NAMES[found.kind]].create();
};

const parsePageEditorInlineMarkdown = (schema: Schema, text: string): readonly EditorNode[] => {
  const nodes: EditorNode[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    const found = findEarliestInlineMatch(remaining);
    if (found === null) {
      nodes.push(schema.text(remaining));
      break;
    }
    if (found.index > 0) nodes.push(schema.text(remaining.slice(0, found.index)));
    const mark = readPageEditorMarkdownMark(schema, found);
    const matched = remaining.slice(found.index, found.index + found.length);
    nodes.push(mark === null ? schema.text(matched) : schema.text(found.label, [mark]));
    remaining = remaining.slice(found.index + found.length);
  }
  return nodes;
};

const buildPageEditorParagraphFromText = (schema: Schema, text: string): EditorNode => {
  const inline = parsePageEditorInlineMarkdown(schema, text);
  return schema.nodes.paragraph.createChecked(null, inline.length === 0 ? null : inline);
};

const readPageEditorCodeLanguage = (written: string | undefined): string | null =>
  PAGE_CODE_LANGUAGES.find((language) => language === written) ?? null;

const readPageEditorCodeFence = (schema: Schema, lines: readonly string[], start: number): PageEditorMarkdownGroup => {
  const language = readPageEditorCodeLanguage(PAGE_EDITOR_MARKDOWN_CODE_FENCE_LINE.exec(lines[start])?.[1]);
  const body: string[] = [];
  let index = start + 1;
  while (index < lines.length && !PAGE_EDITOR_MARKDOWN_CODE_FENCE_LINE.test(lines[index])) {
    body.push(lines[index]);
    index += 1;
  }
  const next = index < lines.length ? index + 1 : index;
  const written = body.join('\n');
  const content = written.length === 0 ? null : schema.text(written);
  return { block: schema.nodes.code_block.createChecked({ language }, content), next };
};

const readPageEditorHeading = (schema: Schema, lines: readonly string[], start: number): PageEditorMarkdownGroup => {
  const match = PAGE_EDITOR_MARKDOWN_HEADING_LINE.exec(lines[start]);
  const level = match === null ? 1 : match[1].length;
  const text = match === null ? '' : match[2];
  const inline = parsePageEditorInlineMarkdown(schema, text);
  return { block: schema.nodes.heading.createChecked({ level }, inline.length === 0 ? null : inline), next: start + 1 };
};

const readPageEditorDivider = (schema: Schema, _lines: readonly string[], start: number): PageEditorMarkdownGroup => ({
  block: schema.nodes.divider.createChecked(),
  next: start + 1,
});

const readPageEditorQuote = (schema: Schema, lines: readonly string[], start: number): PageEditorMarkdownGroup => {
  const paragraphs: EditorNode[] = [];
  let index = start;
  while (index < lines.length) {
    const match = PAGE_EDITOR_MARKDOWN_QUOTE_LINE.exec(lines[index]);
    if (match === null) break;
    paragraphs.push(buildPageEditorParagraphFromText(schema, match[1]));
    index += 1;
  }
  return { block: schema.nodes.blockquote.createChecked(null, paragraphs), next: index };
};

const readPageEditorBulletList = (schema: Schema, lines: readonly string[], start: number): PageEditorMarkdownGroup => {
  const items: EditorNode[] = [];
  let index = start;
  while (index < lines.length) {
    const match = PAGE_EDITOR_MARKDOWN_BULLET_LINE.exec(lines[index]);
    if (match === null) break;
    items.push(schema.nodes.list_item.createChecked(null, buildPageEditorParagraphFromText(schema, match[1])));
    index += 1;
  }
  return { block: schema.nodes.bullet_list.createChecked(null, items), next: index };
};

const readPageEditorOrderedList = (
  schema: Schema,
  lines: readonly string[],
  start: number,
): PageEditorMarkdownGroup => {
  const items: EditorNode[] = [];
  let order: number | null = null;
  let index = start;
  while (index < lines.length) {
    const match = PAGE_EDITOR_MARKDOWN_ORDERED_LINE.exec(lines[index]);
    if (match === null) break;
    order ??= Number(match[1]);
    items.push(schema.nodes.list_item.createChecked(null, buildPageEditorParagraphFromText(schema, match[2])));
    index += 1;
  }
  return { block: schema.nodes.ordered_list.createChecked({ order: order ?? 1 }, items), next: index };
};

const readPageEditorTaskList = (schema: Schema, lines: readonly string[], start: number): PageEditorMarkdownGroup => {
  const items: EditorNode[] = [];
  let index = start;
  while (index < lines.length) {
    const match = PAGE_EDITOR_MARKDOWN_TASK_LINE.exec(lines[index]);
    if (match === null) break;
    const checked = match[1].toLowerCase() === 'x';
    items.push(schema.nodes.task_item.createChecked({ checked }, buildPageEditorParagraphFromText(schema, match[2])));
    index += 1;
  }
  return { block: schema.nodes.task_list.createChecked(null, items), next: index };
};

const lineMatchers: readonly PageEditorMarkdownLineMatcher[] = [
  { read: readPageEditorCodeFence, test: (line) => PAGE_EDITOR_MARKDOWN_CODE_FENCE_LINE.test(line) },
  { read: readPageEditorHeading, test: (line) => PAGE_EDITOR_MARKDOWN_HEADING_LINE.test(line) },
  { read: readPageEditorDivider, test: (line) => PAGE_EDITOR_MARKDOWN_DIVIDER_LINE.test(line) },
  { read: readPageEditorQuote, test: (line) => PAGE_EDITOR_MARKDOWN_QUOTE_LINE.test(line) },
  { read: readPageEditorTaskList, test: (line) => PAGE_EDITOR_MARKDOWN_TASK_LINE.test(line) },
  { read: readPageEditorBulletList, test: (line) => PAGE_EDITOR_MARKDOWN_BULLET_LINE.test(line) },
  { read: readPageEditorOrderedList, test: (line) => PAGE_EDITOR_MARKDOWN_ORDERED_LINE.test(line) },
];

const findPageEditorMarkdownMatcher = (line: string): PageEditorMarkdownLineMatcher | undefined =>
  lineMatchers.find((matcher) => matcher.test(line));

const readPageEditorParagraph = (schema: Schema, lines: readonly string[], start: number): PageEditorMarkdownGroup => {
  const written: string[] = [];
  let index = start;
  while (
    index < lines.length &&
    lines[index].trim().length > 0 &&
    findPageEditorMarkdownMatcher(lines[index]) === undefined
  ) {
    written.push(lines[index]);
    index += 1;
  }
  return { block: buildPageEditorParagraphFromText(schema, written.join(' ')), next: index };
};

export const looksLikePageEditorMarkdown = (text: string): boolean =>
  text.split(PAGE_EDITOR_LINE_BREAK_PATTERN).some((line) => findPageEditorMarkdownMatcher(line) !== undefined);

export const parsePageEditorMarkdown = (schema: Schema, text: string): readonly EditorNode[] => {
  const lines = text.split(PAGE_EDITOR_LINE_BREAK_PATTERN);
  const blocks: EditorNode[] = [];
  let index = 0;
  while (index < lines.length) {
    if (lines[index].trim().length === 0) {
      index += 1;
      continue;
    }
    const matcher = findPageEditorMarkdownMatcher(lines[index]);
    const group =
      matcher === undefined ? readPageEditorParagraph(schema, lines, index) : matcher.read(schema, lines, index);
    blocks.push(group.block);
    index = group.next;
  }
  return blocks;
};
