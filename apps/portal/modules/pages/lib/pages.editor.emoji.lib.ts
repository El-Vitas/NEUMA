import type { Command } from 'prosemirror-state';
import {
  PAGE_EDITOR_EMOJI_MENU_LIMIT,
  PAGE_EDITOR_EMOJI_TRIGGER,
  PAGE_EDITOR_EMOJIS,
} from '../constants/pages.editor.emoji.constants';
import type { PageEmojiEntry } from '../types/pages.editor.emoji.types';
import type { PagesEditorMenuItem } from '../types/pages.editor.slash-menu.types';
import { foldPageLookingText } from './pages.looking.lib';

/** Read the same way a page name is read while somebody types: capitals and accents are not part of the asking. */
const asItIsLookedFor = (written: string): string => foldPageLookingText(written.trim());

/** Whether an emoji answers to what was typed, in either of the names it is called. */
const answersToTheEmojiName = (entry: PageEmojiEntry, written: string): boolean => {
  const looked = asItIsLookedFor(written);
  return looked.length === 0 || entry.names.some((name) => asItIsLookedFor(name).includes(looked));
};

/** The emoji that answer to what was typed, at most a handful. */
export const findEmojiCandidates = (query: string): readonly PageEmojiEntry[] =>
  PAGE_EDITOR_EMOJIS.filter((entry) => answersToTheEmojiName(entry, query)).slice(0, PAGE_EDITOR_EMOJI_MENU_LIMIT);

/** How an emoji is offered in the finder: itself, standing beside the name it goes by. */
const describeEmojiCandidate = (entry: PageEmojiEntry): string => `${entry.character} ${entry.names[0] ?? ''}`;

/** Writes the emoji where the cursor stands, as the character it is — no node, no attrs to carry. */
export const createEmojiInsertCommand =
  (character: string): Command =>
  (state, dispatch) => {
    if (dispatch === undefined) return true;
    dispatch(state.tr.insertText(character));
    return true;
  };

/** The emoji finder's own menu, one entry per emoji that answers to what was typed. */
export const buildEmojiTriggerItems = (triggerQuery: string | null): readonly PagesEditorMenuItem[] =>
  findEmojiCandidates(triggerQuery ?? '').map((entry) => ({
    id: entry.character,
    label: describeEmojiCandidate(entry),
    run: createEmojiInsertCommand(entry.character),
  }));

/**
 * Asks for an emoji the same way `@` asks for a page: by writing the trigger,
 * so the finder that already answers it opens.
 */
export const askForEmoji: Command = (state, dispatch) => {
  if (dispatch === undefined) return true;
  dispatch(state.tr.insertText(PAGE_EDITOR_EMOJI_TRIGGER));
  return true;
};
