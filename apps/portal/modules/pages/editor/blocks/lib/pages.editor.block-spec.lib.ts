import type { Node as EditorNode, NodeSpec, TagParseRule } from 'prosemirror-model';
import {
  PAGE_EDITOR_BACKGROUND_COLOR_ATTRIBUTE,
  PAGE_EDITOR_BLOCK_ID_ATTRIBUTE,
  PAGE_EDITOR_TEXT_COLOR_ATTRIBUTE,
} from '../constants/pages.editor.blocks.constants';
import type { PageBlockDefinition } from '../types/pages.editor.block-spec.types';

const readPageBlockAttribute = (node: EditorNode, attribute: string, name: string): Record<string, string> =>
  typeof node.attrs[name] === 'string' ? { [attribute]: node.attrs[name] } : {};

/** Colours are written as names, not styles, so saved blocks keep working if the palette changes. */
export const getPageBlockDomAttributes = (node: EditorNode): Record<string, string> => ({
  ...readPageBlockAttribute(node, PAGE_EDITOR_BLOCK_ID_ATTRIBUTE, 'id'),
  ...readPageBlockAttribute(node, PAGE_EDITOR_TEXT_COLOR_ATTRIBUTE, 'textColor'),
  ...readPageBlockAttribute(node, PAGE_EDITOR_BACKGROUND_COLOR_ATTRIBUTE, 'backgroundColor'),
});

export const getPageBlockAttrs = (
  element: Element,
): { readonly backgroundColor: string | null; readonly id: string | null; readonly textColor: string | null } => ({
  backgroundColor: element.getAttribute(PAGE_EDITOR_BACKGROUND_COLOR_ATTRIBUTE),
  id: element.getAttribute(PAGE_EDITOR_BLOCK_ID_ATTRIBUTE),
  textColor: element.getAttribute(PAGE_EDITOR_TEXT_COLOR_ATTRIBUTE),
});

const withBlockAttrParsing = (rule: TagParseRule): TagParseRule =>
  rule.getAttrs === undefined && rule.attrs === undefined ? { ...rule, getAttrs: getPageBlockAttrs } : rule;

/** Adds the attributes shared by every block, so changing them happens here once. */
export const definePageBlock = (definition: PageBlockDefinition): NodeSpec => {
  const { parseDOM, render, ...rest } = definition;
  return {
    ...rest,
    parseDOM: parseDOM.map(withBlockAttrParsing),
    toDOM: (node: EditorNode) => render(node, getPageBlockDomAttributes(node)),
  };
};
