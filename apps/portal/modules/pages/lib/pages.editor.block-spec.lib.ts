import type { Node as EditorNode, NodeSpec, TagParseRule } from 'prosemirror-model';
import {
  PAGE_EDITOR_BLOCK_ID_ATTRIBUTE,
  PAGE_EDITOR_OPTIONAL_BLOCK_ID,
} from '../constants/pages.editor.blocks.constants';
import type { PageBlockDefinition } from '../types/pages.editor.block-spec.types';

export const getPageBlockDomAttributes = (node: EditorNode): Record<string, string> =>
  typeof node.attrs.id === 'string' ? { [PAGE_EDITOR_BLOCK_ID_ATTRIBUTE]: node.attrs.id } : {};

export const getPageBlockIdAttrs = (element: Element): { readonly id: string | null } => ({
  id: element.getAttribute(PAGE_EDITOR_BLOCK_ID_ATTRIBUTE),
});

const withBlockIdParsing = (rule: TagParseRule): TagParseRule =>
  rule.getAttrs === undefined && rule.attrs === undefined ? { ...rule, getAttrs: getPageBlockIdAttrs } : rule;

/**
 * Declares a block type: it adds the id every block carries, writes it into
 * the rendered page and reads it back when parsing, so a change to what all
 * blocks share is made here once instead of in every block type.
 */
export const definePageBlock = (definition: PageBlockDefinition): NodeSpec => {
  const { parseDOM, render, ...rest } = definition;
  return {
    ...rest,
    attrs: { ...definition.attrs, id: PAGE_EDITOR_OPTIONAL_BLOCK_ID },
    parseDOM: parseDOM.map(withBlockIdParsing),
    toDOM: (node: EditorNode) => render(node, getPageBlockDomAttributes(node)),
  };
};
