import type { Node as EditorNode, NodeRange } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_BLOCK_GROUP } from '../constants/pages.editor.blocks.constants';
import { acceptsSiblingBlocks } from './pages.editor.block-target.lib';

/**
 * A container that only exists to hold blocks — the page, a column, a cell,
 * what hangs from a nesting — as opposed to a block that happens to hold
 * others, such as a quote or a callout, which is itself what a gesture aims at.
 */
export const holdsStandaloneBlocks = (node: EditorNode): boolean =>
  acceptsSiblingBlocks(node) && node.type.spec.group !== PAGE_EDITOR_BLOCK_GROUP;

/**
 * The blocks a gesture applies to: every block the selection covers, read from
 * the container that holds them as siblings.
 *
 * One answer for all of them — converting, duplicating, deleting — so a cursor
 * inside a quote acts on the quote, one inside a list acts on the list, and one
 * in a table cell acts on the paragraph it is typing in.
 */
export const findSelectedPageBlocks = (state: EditorState): NodeRange | null =>
  state.selection.$from.blockRange(state.selection.$to, holdsStandaloneBlocks);
