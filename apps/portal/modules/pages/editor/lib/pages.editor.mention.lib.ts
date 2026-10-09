import type { Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { PageMentionInsertCommandOptions } from '../../types/pages.types';
import {
  PAGE_EDITOR_MENTION_REQUEST_SELECTOR,
  PAGE_EDITOR_MENTION_TITLE_ATTRIBUTE,
} from '../blocks/constants/pages.editor.blocks.constants';
import { createPageEditorAskCommand } from './pages.editor.ask.lib';

export const askToMakeTheNamedPage = (title: string): Command =>
  createPageEditorAskCommand(PAGE_EDITOR_MENTION_REQUEST_SELECTOR, (answering) => {
    answering.dataset[PAGE_EDITOR_MENTION_TITLE_ATTRIBUTE] = title;
  });

/** Takes an explicit position because creating the page is async and the cursor may have moved by then. */
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
