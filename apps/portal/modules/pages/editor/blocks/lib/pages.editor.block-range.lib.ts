import type { Node as EditorNode, NodeRange, ResolvedPos } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_BLOCK_GROUP } from '../constants/pages.editor.blocks.constants';
import { acceptsSiblingBlocks } from './pages.editor.block-target.lib';

/** True for pure containers (page, column, cell), not for blocks like a quote that hold others but are a target. */
export const holdsStandaloneBlocks = (node: EditorNode): boolean =>
  acceptsSiblingBlocks(node) && node.type.spec.group !== PAGE_EDITOR_BLOCK_GROUP;

/** A cursor inside a quote or list acts on that quote or list; inside a table cell, on its paragraph. */
export const findSelectedPageBlocks = (state: EditorState): NodeRange | null =>
  state.selection.$from.blockRange(state.selection.$to, holdsStandaloneBlocks);

export const findPageBlockAround = (place: ResolvedPos): NodeRange | null =>
  place.blockRange(place, holdsStandaloneBlocks);
