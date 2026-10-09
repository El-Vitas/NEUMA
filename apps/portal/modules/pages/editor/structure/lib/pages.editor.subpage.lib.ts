import type { PageLifecycle } from '@neuma/shared';
import type { Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { PageIcon } from '../../../appearance/types/pages.icon.types';
import {
  PAGE_EDITOR_MENTION_TRIGGER,
  PAGE_EDITOR_SUBPAGE_REQUEST_SELECTOR,
} from '../../blocks/constants/pages.editor.blocks.constants';
import { createPageEditorAskCommand, createPageEditorWriteCommand } from '../../lib/pages.editor.ask.lib';
import { leaveSomewhereToWriteUnder } from '../../lib/pages.editor.write-under.lib';
import type { PageSubpageInsert } from '../types/pages.editor.subpage.types';

/** A child page must be created outside the editor, so the menu asks the host page to make one. */
export const askForPageChild: Command = createPageEditorAskCommand(PAGE_EDITOR_SUBPAGE_REQUEST_SELECTOR);

/** Takes the position explicitly: creating the page is async and the selection has moved by then. */
export const createPageSubpageInsertCommand =
  (schema: Schema, subpage: PageSubpageInsert, spot: number): Command =>
  (state, dispatch) => {
    const subpageType = schema.nodes.subpage;
    if (subpageType === undefined) return false;
    if (dispatch === undefined) return true;

    const node = subpageType.createChecked(subpage);
    const at = Math.min(Math.max(spot, 0), state.doc.content.size);
    dispatch(leaveSomewhereToWriteUnder(state.tr.replaceRangeWith(at, at, node), schema).scrollIntoView());
    return true;
  };

/** Types the mention trigger, so the menu and a typed `@` open the same page search. */
export const askForAPageAlreadyWritten: Command = createPageEditorWriteCommand(PAGE_EDITOR_MENTION_TRIGGER);

export const nameTheChildPage = (title: string, untitled: string): string =>
  title.trim().length > 0 ? title.trim() : untitled;

export const readPageTitleFrom = (
  pages: readonly { readonly id: string; readonly title: string }[],
  pageId: string,
): string | null => pages.find((page) => page.id === pageId)?.title ?? null;

export const readPageIconFrom = (
  pages: readonly { readonly icon?: PageIcon | null; readonly id: string }[],
  pageId: string,
): PageIcon | null => pages.find((page) => page.id === pageId)?.icon ?? null;

/** Null when the page is not in the list (another space, say), which does not mean it was deleted. */
export const readPageLifecycleFrom = (
  pages: readonly { readonly id: string; readonly lifecycle: PageLifecycle }[],
  pageId: string,
): PageLifecycle | null => pages.find((page) => page.id === pageId)?.lifecycle ?? null;
