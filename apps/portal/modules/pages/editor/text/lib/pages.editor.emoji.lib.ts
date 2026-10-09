import type { Command } from 'prosemirror-state';
import { foldPageLookingText } from '../../../links/lib/pages.looking.lib';
import { createPageEditorWriteCommand } from '../../lib/pages.editor.ask.lib';
import type { PagesEditorMenuItem } from '../../menus/types/pages.editor.slash-menu.types';
import {
  PAGE_EDITOR_EMOJI_MENU_LIMIT,
  PAGE_EDITOR_EMOJI_TRIGGER,
  PAGE_EDITOR_EMOJIS,
} from '../constants/pages.editor.emoji.constants';
import type { PageEmojiEntry } from '../types/pages.editor.emoji.types';

const asItIsLookedFor = (written: string): string => foldPageLookingText(written.trim());

const answersToTheEmojiName = (entry: PageEmojiEntry, written: string): boolean => {
  const looked = asItIsLookedFor(written);
  return looked.length === 0 || entry.names.some((name) => asItIsLookedFor(name).includes(looked));
};

export const findEmojiCandidates = (query: string): readonly PageEmojiEntry[] =>
  PAGE_EDITOR_EMOJIS.filter((entry) => answersToTheEmojiName(entry, query)).slice(0, PAGE_EDITOR_EMOJI_MENU_LIMIT);

const describeEmojiCandidate = (entry: PageEmojiEntry): string => `${entry.character} ${entry.names[0] ?? ''}`;

export const createEmojiInsertCommand = (character: string): Command => createPageEditorWriteCommand(character);

export const buildEmojiTriggerItems = (triggerQuery: string | null): readonly PagesEditorMenuItem[] =>
  findEmojiCandidates(triggerQuery ?? '').map((entry) => ({
    id: entry.character,
    label: describeEmojiCandidate(entry),
    run: createEmojiInsertCommand(entry.character),
  }));

export const askForEmoji: Command = createPageEditorWriteCommand(PAGE_EDITOR_EMOJI_TRIGGER);
