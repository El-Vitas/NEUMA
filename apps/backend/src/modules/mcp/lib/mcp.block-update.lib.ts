import {
  describeMissingPageBlock,
  findPageBlock,
  isOneOf,
  isPageDocumentNode,
  listPageDocumentChildren,
  type PageBlockPlace,
  type PageDocumentNodeShape,
  Result,
  replacePageBlock,
} from '@company-brain/shared';
import { MCP_BLOCK_COLOR_NAMES, MCP_BLOCK_KEPT_ATTRIBUTES } from '../constants/mcp.constants';
import type { McpBlockChange, McpBlockColors, McpBlockPlaceInput, McpContentEdit } from '../types/mcp.pages.types';

/** Defaults to the end of the page when no place is given. */
export const readMcpBlockPlace = (input: McpBlockPlaceInput): Result<PageBlockPlace, string> => {
  const named = [input.after, input.before, input.inside].filter((blockId) => blockId !== undefined);
  if (named.length > 1) return Result.fail('Say only one of after, before or inside.');
  const at = input.at ?? 'end';
  if (input.after !== undefined) return Result.ok({ after: input.after });
  if (input.before !== undefined) return Result.ok({ before: input.before });
  if (input.inside !== undefined) return Result.ok({ at, inside: input.inside });
  return Result.ok({ at });
};

const withFirstLine = (node: PageDocumentNodeShape, inline: readonly unknown[]): PageDocumentNodeShape => {
  const [line, ...rest] = listPageDocumentChildren(node);
  return line === undefined ? node : { ...node, content: [{ ...line, content: inline }, ...rest] };
};

const holdsOnlyParagraphs = (node: PageDocumentNodeShape): boolean =>
  listPageDocumentChildren(node).every((child) => isPageDocumentNode(child) && child.type === 'paragraph');

/** Rebuilding a quote, callout or toggle that holds other blocks would delete them, so those are changed one by one. */
const rewriteHeld = (
  node: PageDocumentNodeShape,
  words: NonNullable<McpBlockChange['words']>,
): Result<PageDocumentNodeShape, string> =>
  holdsOnlyParagraphs(node)
    ? Result.ok({ ...node, content: words.paragraphs })
    : Result.fail(
        `This ${node.type} holds other blocks besides its words. Change them one by one by their ids, or send a replacement for the whole ${node.type}.`,
      );

const rewriteWords = (
  node: PageDocumentNodeShape,
  words: NonNullable<McpBlockChange['words']>,
): Result<PageDocumentNodeShape, string> => {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
      return Result.ok({ ...node, content: words.inline });
    case 'list_item':
    case 'task_item':
      return Result.ok(withFirstLine(node, words.inline));
    case 'blockquote':
    case 'callout':
    case 'toggle':
      return rewriteHeld(node, words);
    case 'code_block':
      return Result.ok({ ...node, content: [{ text: words.text, type: 'text' }] });
    default:
      return Result.fail(`A ${node.type} has no words of its own to change: send a replacement block instead.`);
  }
};

const check = (node: PageDocumentNodeShape, checked: boolean): Result<PageDocumentNodeShape, string> =>
  node.type === 'task_item'
    ? Result.ok({ ...node, attrs: { ...node.attrs, checked } })
    : Result.fail(`Only a checklist item can be checked, and this block is a ${node.type}.`);

const retitle = (node: PageDocumentNodeShape, summary: string): Result<PageDocumentNodeShape, string> =>
  node.type === 'toggle'
    ? Result.ok({ ...node, attrs: { ...node.attrs, summary } })
    : Result.fail(`Only a toggle has a summary, and this block is a ${node.type}.`);

/** Carries over other people's comments and the old colors; colors on the replacement win. */
const keepAnnotations = (node: PageDocumentNodeShape, replacement: unknown): unknown => {
  if (!isPageDocumentNode(replacement)) return replacement;
  const kept = Object.entries(node.attrs ?? {}).filter(([name]) => isOneOf(MCP_BLOCK_KEPT_ATTRIBUTES, name));
  return { ...replacement, attrs: { ...Object.fromEntries(kept), ...replacement.attrs } };
};

const changeWords = (node: PageDocumentNodeShape, change: McpBlockChange): Result<PageDocumentNodeShape, string> => {
  const withWords =
    change.words === undefined ? Result.ok<PageDocumentNodeShape, string>(node) : rewriteWords(node, change.words);
  if (withWords.isFail() || change.summary === undefined) return withWords;
  return retitle(withWords.getValue(), change.summary);
};

const changeContent = (node: PageDocumentNodeShape, change: McpBlockChange): Result<unknown, string> => {
  if (change.replacement !== undefined) return Result.ok(keepAnnotations(node, change.replacement));
  const withWords = changeWords(node, change);
  if (withWords.isFail() || change.checked === undefined) return withWords;
  return check(withWords.getValue(), change.checked);
};

/** A `null` color is removed; colors not named stay. */
const paint = (node: unknown, colors: McpBlockColors): unknown => {
  if (!isPageDocumentNode(node)) return node;
  const painted = Object.entries({ ...node.attrs, ...colors }).filter(
    ([name, value]) => !(value === null && isOneOf(MCP_BLOCK_COLOR_NAMES, name)),
  );
  return { ...node, attrs: Object.fromEntries(painted) };
};

const applyChange = (node: PageDocumentNodeShape, change: McpBlockChange): Result<unknown, string> => {
  const changed = changeContent(node, change);
  if (changed.isFail() || change.colors === undefined) return changed;
  return Result.ok(paint(changed.getValue(), change.colors));
};

/** The block keeps its id so links pointing at it keep working. */
export const buildMcpBlockUpdate =
  (blockId: string, change: McpBlockChange): McpContentEdit =>
  (content) => {
    const node = findPageBlock(content.content, blockId);
    if (node === null) return Result.fail(describeMissingPageBlock(blockId));
    const changed = applyChange(node, change);
    return changed.isFail() ? Result.fail(changed.getError()) : replacePageBlock(content, blockId, changed.getValue());
  };
