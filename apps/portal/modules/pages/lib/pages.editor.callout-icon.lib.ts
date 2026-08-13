import type { Node as EditorNode } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import {
  PAGE_EDITOR_CALLOUT_ICON_ATTRIBUTE,
  PAGE_EDITOR_CALLOUT_TYPE,
} from '../constants/pages.editor.blocks.constants';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

const findSelectedCallout = (state: EditorState): { readonly node: EditorNode; readonly position: number } | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const node = range.parent.child(range.startIndex);
  return node.type.name === PAGE_EDITOR_CALLOUT_TYPE ? { node, position: range.start } : null;
};

/** Whether the block in play is an aside at all: only one of those carries a mark. */
export const isPageEditorCalloutSelected = (state: EditorState): boolean => findSelectedCallout(state) !== null;

/** The mark the selected callout carries, so the menu can show which one is in use. */
export const readPageEditorCalloutIcon = (state: EditorState): string | null => {
  const callout = findSelectedCallout(state);
  const icon: unknown = callout?.node.attrs[PAGE_EDITOR_CALLOUT_ICON_ATTRIBUTE];
  return typeof icon === 'string' ? icon : null;
};

/**
 * Marks the selected callout, or takes the mark off when given none.
 *
 * The mark lands on the block rather than on what it says, so it survives
 * rewriting the aside and travels with it when it moves.
 */
export const createPageEditorCalloutIconCommand =
  (icon: string | null): Command =>
  (state, dispatch) => {
    const callout = findSelectedCallout(state);
    if (callout === null) return false;
    if (dispatch === undefined) return true;
    dispatch(state.tr.setNodeAttribute(callout.position, PAGE_EDITOR_CALLOUT_ICON_ATTRIBUTE, icon));
    return true;
  };
