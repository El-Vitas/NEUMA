import type { EditorState } from 'prosemirror-state';
import {
  PAGE_EDITOR_BLOCK_ARRIVAL_STYLE_CLASSES,
  PAGE_EDITOR_BLOCK_ID_ATTRIBUTE,
} from '../constants/pages.editor.blocks.constants';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

/** The identity of the block a gesture is aimed at, or nothing when it has none yet. */
export const readPageEditorBlockId = (state: EditorState): string | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const blockId: unknown = range.parent.child(range.startIndex).attrs.id;
  return typeof blockId === 'string' && blockId.length > 0 ? blockId : null;
};

/**
 * The address of a block: the page it lives on, plus which block it is.
 *
 * The identity is the block's own and survives editing its neighbours, so the
 * link keeps pointing at it after the page around it changes.
 */
export const buildPageEditorBlockLink = (pageUrl: string, blockId: string): string => {
  const [address] = pageUrl.split('#');
  return `${address ?? pageUrl}#${blockId}`;
};

/** Which block a page address is asking for, if it asks for one. */
export const readPageEditorBlockLinkTarget = (pageUrl: string): string | null => {
  const anchor = pageUrl.split('#')[1];
  return anchor === undefined || anchor.length === 0 ? null : decodeURIComponent(anchor);
};

export const findPageEditorBlockElement = (root: ParentNode, blockId: string): Element | null =>
  root.querySelector(`[${PAGE_EDITOR_BLOCK_ID_ATTRIBUTE}="${CSS.escape(blockId)}"]`);

/**
 * Brings the block into sight and marks it for a moment, so arriving from a
 * link lands on the block rather than somewhere on the page.
 *
 * Returns how to undo the mark, so leaving the page does not leave it lit.
 */
export const revealPageEditorBlock = (element: Element): (() => void) => {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  for (const className of PAGE_EDITOR_BLOCK_ARRIVAL_STYLE_CLASSES) element.classList.add(className);
  return () => {
    for (const className of PAGE_EDITOR_BLOCK_ARRIVAL_STYLE_CLASSES) element.classList.remove(className);
  };
};
