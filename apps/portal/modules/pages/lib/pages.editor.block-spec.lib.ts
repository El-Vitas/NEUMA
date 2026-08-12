import type { Node as EditorNode, NodeSpec, TagParseRule } from 'prosemirror-model';
import {
  PAGE_EDITOR_BACKGROUND_COLOR_ATTRIBUTE,
  PAGE_EDITOR_BLOCK_COMMENTED_ATTRIBUTE,
  PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE,
  PAGE_EDITOR_BLOCK_ID_ATTRIBUTE,
  PAGE_EDITOR_OPTIONAL_BLOCK_COLOR,
  PAGE_EDITOR_OPTIONAL_BLOCK_COMMENTS,
  PAGE_EDITOR_OPTIONAL_BLOCK_ID,
  PAGE_EDITOR_TEXT_COLOR_ATTRIBUTE,
} from '../constants/pages.editor.blocks.constants';
import type { PageBlockDefinition } from '../types/pages.editor.block-spec.types';

const readPageBlockAttribute = (node: EditorNode, attribute: string, name: string): Record<string, string> =>
  typeof node.attrs[name] === 'string' ? { [attribute]: node.attrs[name] } : {};

/**
 * What every block writes into the page: who it is and how it is painted.
 *
 * The colours travel as names rather than as styles, so the page decides how
 * each one looks and a block saved today keeps reading well when that decision
 * changes.
 */
export const getPageBlockDomAttributes = (node: EditorNode): Record<string, string> => ({
  ...readPageBlockAttribute(node, PAGE_EDITOR_BLOCK_ID_ATTRIBUTE, 'id'),
  ...readPageBlockAttribute(node, PAGE_EDITOR_TEXT_COLOR_ATTRIBUTE, 'textColor'),
  ...readPageBlockAttribute(node, PAGE_EDITOR_BACKGROUND_COLOR_ATTRIBUTE, 'backgroundColor'),
  ...(Array.isArray(node.attrs[PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE]) &&
  node.attrs[PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE].length > 0
    ? { [PAGE_EDITOR_BLOCK_COMMENTED_ATTRIBUTE]: 'true' }
    : {}),
});

/** Reads back what every block carries, so pasting a block keeps its identity and its colours. */
export const getPageBlockAttrs = (
  element: Element,
): { readonly backgroundColor: string | null; readonly id: string | null; readonly textColor: string | null } => ({
  backgroundColor: element.getAttribute(PAGE_EDITOR_BACKGROUND_COLOR_ATTRIBUTE),
  id: element.getAttribute(PAGE_EDITOR_BLOCK_ID_ATTRIBUTE),
  textColor: element.getAttribute(PAGE_EDITOR_TEXT_COLOR_ATTRIBUTE),
});

const withBlockAttrParsing = (rule: TagParseRule): TagParseRule =>
  rule.getAttrs === undefined && rule.attrs === undefined ? { ...rule, getAttrs: getPageBlockAttrs } : rule;

/**
 * Declares a block type: it adds what every block carries — its identity and
 * its colours — writes it into the rendered page and reads it back when
 * parsing, so a change to what all blocks share is made here once instead of in
 * every block type.
 */
export const definePageBlock = (definition: PageBlockDefinition): NodeSpec => {
  const { parseDOM, render, ...rest } = definition;
  return {
    ...rest,
    attrs: {
      ...definition.attrs,
      backgroundColor: PAGE_EDITOR_OPTIONAL_BLOCK_COLOR,
      [PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE]: PAGE_EDITOR_OPTIONAL_BLOCK_COMMENTS,
      id: PAGE_EDITOR_OPTIONAL_BLOCK_ID,
      textColor: PAGE_EDITOR_OPTIONAL_BLOCK_COLOR,
    },
    parseDOM: parseDOM.map(withBlockAttrParsing),
    toDOM: (node: EditorNode) => render(node, getPageBlockDomAttributes(node)),
  };
};
