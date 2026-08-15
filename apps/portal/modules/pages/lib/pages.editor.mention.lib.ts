import type { Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import {
  PAGE_EDITOR_MENTION_REQUEST_SELECTOR,
  PAGE_EDITOR_MENTION_TITLE_ATTRIBUTE,
} from '../constants/pages.editor.blocks.constants';
import type { PageMentionInsertCommandOptions } from '../types/pages.types';
import { createPageEditorAskCommand } from './pages.editor.ask.lib';

/**
 * Asks for the page that was named but is not written yet.
 *
 * Naming a page that does not exist is how a page is often started — the
 * thought comes first and the page after — so the finder offers to make it
 * instead of answering that it found nothing. Making one is not something the
 * writing can do, so it is asked of whoever holds the page, under the name
 * that was typed.
 */
export const askToMakeTheNamedPage = (title: string): Command =>
  createPageEditorAskCommand(PAGE_EDITOR_MENTION_REQUEST_SELECTOR, (answering) => {
    answering.dataset[PAGE_EDITOR_MENTION_TITLE_ATTRIBUTE] = title;
  });

/**
 * Names the page where the writing was left.
 *
 * Where it was left is said outright rather than read from the writing, for
 * the same reason a child page says it: making a page takes a moment, and in
 * that moment the cursor has been elsewhere.
 */
export const createPageMentionInsertAtCommand =
  (schema: Schema, mention: PageMentionInsertCommandOptions, spot: number): Command =>
  (state, dispatch) => {
    const mentionType = schema.nodes.mention;
    if (mentionType === undefined) return false;
    if (dispatch === undefined) return true;

    const node = mentionType.createChecked(mention);
    const at = Math.min(Math.max(spot, 0), state.doc.content.size);
    dispatch(state.tr.replaceRangeWith(at, at, node).scrollIntoView());
    return true;
  };
