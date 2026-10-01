import {
  isPageDocumentNode,
  listPageDocumentChildren,
  type PageBlockPlace,
  type PageDocumentNodeShape,
  Result,
  replacePageBlock,
} from '@company-brain/shared';
import { MCP_BLOCK_COLOR_NAMES } from '../constants/mcp.constants';
import type { McpBlockChange, McpBlockColors, McpBlockPlaceInput, McpContentEdit } from '../types/mcp.pages.types';
import { describeMcpMissingBlock, findMcpBlockNode } from './mcp.blocks.lib';

/** El lugar que pidió el agente, como lo entienden las ediciones de una página: el final de la página si no pidió ninguno. */
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

/** Un bloque con otras palabras, del mismo tipo. Cada tipo guarda sus palabras en su sitio. */
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
      return Result.ok({ ...node, content: [{ content: words.inline, type: 'paragraph' }] });
    case 'toggle':
      return Result.ok({ ...node, attrs: { ...node.attrs, summary: words.text } });
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

const changeContent = (node: PageDocumentNodeShape, change: McpBlockChange): Result<unknown, string> => {
  if (change.replacement !== undefined) return Result.ok(change.replacement);
  const withWords =
    change.words === undefined ? Result.ok<PageDocumentNodeShape, string>(node) : rewriteWords(node, change.words);
  if (withWords.isFail() || change.checked === undefined) return withWords;
  return check(withWords.getValue(), change.checked);
};

/** Pinta un bloque entero con los colores pedidos; un color en `null` se quita, y el que no se nombra se queda. */
const paint = (node: unknown, colors: McpBlockColors): unknown => {
  if (!isPageDocumentNode(node)) return node;
  const painted = Object.entries({ ...node.attrs, ...colors }).filter(
    ([name, value]) => !(value === null && MCP_BLOCK_COLOR_NAMES.some((color) => color === name)),
  );
  return { ...node, attrs: Object.fromEntries(painted) };
};

const applyChange = (node: PageDocumentNodeShape, change: McpBlockChange): Result<unknown, string> => {
  const changed = changeContent(node, change);
  if (changed.isFail() || change.colors === undefined) return changed;
  return Result.ok(paint(changed.getValue(), change.colors));
};

/**
 * El cambio de un bloque, hecho sobre lo que la página dice al escribir. El
 * bloque conserva su id, así los enlaces que lo señalaban siguen llegando.
 */
export const buildMcpBlockUpdate =
  (blockId: string, change: McpBlockChange): McpContentEdit =>
  (content) => {
    const node = findMcpBlockNode(content.content, blockId);
    if (node === null) return Result.fail(describeMcpMissingBlock(blockId));
    const changed = applyChange(node, change);
    return changed.isFail() ? Result.fail(changed.getError()) : replacePageBlock(content, blockId, changed.getValue());
  };
