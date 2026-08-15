import type { Schema } from 'prosemirror-model';
import { PAGE_EDITOR_MENTION_CREATION_ITEM_ID } from '../constants/pages.editor.blocks.constants';
import type {
  PagesEditorMenuItem,
  PagesEditorTrigger,
  PagesEditorTriggerKind,
  SlashMenuKeyDownOptions,
} from '../types/pages.editor.slash-menu.types';
import type { PageMentionCandidate } from '../types/pages.mentions.types';
import type { PageEditorCommand } from '../types/pages.types';
import { createPageMentionInsertCommand } from './pages.editor.commands';
import { askToMakeTheNamedPage } from './pages.editor.mention.lib';

const slashQueryPattern = /(?:^|\s)\/([^\s/]*)$/;
const mentionQueryPattern = /(?:^|\s)@([^\s]*)$/;

export const buildSlashMenuOptionId = (menuId: string, itemId: string): string => `${menuId}-option-${itemId}`;

/**
 * What the editor says about itself while the menu beside the cursor is open.
 *
 * It is said on the editor and not on the menu because the focus never leaves
 * the text: a reader only follows `aria-activedescendant` on the element it is
 * standing on. The words are taken back when the menu closes, so the rest of
 * the time the editor is plain text again and nothing announces a list.
 */
export const describeEditorWithTriggerMenu = (
  menuId: string,
  activeItemId: string | null,
): Readonly<Record<string, string>> =>
  activeItemId === null
    ? {}
    : {
        'aria-activedescendant': buildSlashMenuOptionId(menuId, activeItemId),
        'aria-controls': menuId,
        'aria-expanded': 'true',
        role: 'combobox',
      };

export const getSlashMenuQuery = (text: string): string | null => slashQueryPattern.exec(text)?.[1] ?? null;

export const getMentionMenuQuery = (text: string): string | null => mentionQueryPattern.exec(text)?.[1] ?? null;

export const resolveEditorTrigger = (text: string): PagesEditorTrigger | null => {
  const slashQuery = getSlashMenuQuery(text);
  if (slashQuery !== null) return { kind: 'slash', query: slashQuery };

  const mentionQuery = getMentionMenuQuery(text);
  if (mentionQuery !== null) return { kind: 'mention', query: mentionQuery };

  return null;
};

export const handleSlashMenuKeyDown = ({
  event,
  items,
  onClose,
  onSelect,
  onSelectedIndexChange,
  selectedIndex,
}: SlashMenuKeyDownOptions): boolean => {
  if (event.key === 'Escape') {
    event.preventDefault();
    onClose();
    return true;
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    if (items.length === 0) return false;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    onSelectedIndexChange((selectedIndex + direction + items.length) % items.length);
    return true;
  }
  if (event.key !== 'Enter') return false;
  const item = items[selectedIndex];
  if (item === undefined) return false;
  event.preventDefault();
  onSelect(item);
  return true;
};

const isAlreadyWritten = (mentionCandidates: readonly PageMentionCandidate[], wanted: string): boolean =>
  mentionCandidates.some((candidate) => candidate.label.trim().toLowerCase() === wanted.toLowerCase());

/**
 * The pages that answer to what was typed, and — when none of them is called
 * exactly that — the offer to make the page that was named.
 */
const buildMentionTriggerItems = (
  schema: Schema,
  mentionCandidates: readonly PageMentionCandidate[],
  triggerQuery: string | null,
  nameTheOfferToMakeAPage: (title: string) => string,
): readonly PagesEditorMenuItem[] => {
  const found = mentionCandidates.map((candidate) => ({
    id: candidate.id,
    label: candidate.label,
    run: createPageMentionInsertCommand(schema, {
      label: candidate.label,
      pageId: candidate.id,
      spaceId: candidate.spaceId,
    }),
  }));

  const wanted = triggerQuery?.trim() ?? '';
  if (wanted.length === 0 || isAlreadyWritten(mentionCandidates, wanted)) return found;
  return [
    ...found,
    {
      id: PAGE_EDITOR_MENTION_CREATION_ITEM_ID,
      label: nameTheOfferToMakeAPage(wanted),
      run: askToMakeTheNamedPage(wanted),
    },
  ];
};

const moveRecentToTheFront = (
  items: readonly PagesEditorMenuItem[],
  recentCommandIds: readonly string[],
): readonly PagesEditorMenuItem[] => {
  const recentItems = recentCommandIds
    .flatMap((commandId) => items.filter((item) => item.id === commandId))
    .map((item) => ({ ...item, group: 'recent' as const }));
  const remainingItems = items.filter((item) => !recentCommandIds.includes(item.id));
  return [...recentItems, ...remainingItems];
};

/**
 * Whether a command answers to what was typed after the slash.
 *
 * Its own name counts as well as its label: someone reaching for a list of
 * things to do types `/task`, and the label they would be shown may well be
 * written in another language than the one they are typing in.
 */
const answersTo = (query: string, label: string, commandName: string): boolean =>
  label.toLocaleLowerCase().includes(query) || commandName.toLocaleLowerCase().includes(query);

const buildSlashTriggerItems = (
  commands: Readonly<Record<string, PageEditorCommand>>,
  triggerQuery: string | null,
  translateCommandLabel: (labelKey: string) => string,
  recentCommandIds: readonly string[],
): readonly PagesEditorMenuItem[] => {
  const normalizedQuery = triggerQuery?.toLocaleLowerCase() ?? '';
  const matchingItems = Object.entries(commands).reduce<PagesEditorMenuItem[]>((items, [commandName, command]) => {
    if (command.kind !== 'block') return items;
    const label = translateCommandLabel(command.labelKey);
    if (!answersTo(normalizedQuery, label, commandName)) return items;
    items.push({ group: command.group ?? 'advanced', id: commandName, label, run: command.run });
    return items;
  }, []);
  return moveRecentToTheFront(matchingItems, recentCommandIds);
};

export const buildEditorTriggerItems = (parameters: {
  readonly commands: Readonly<Record<string, PageEditorCommand>>;
  readonly mentionCandidates: readonly PageMentionCandidate[];
  readonly schema: Schema;
  readonly translateCommandLabel: (labelKey: string) => string;
  readonly nameTheOfferToMakeAPage: (title: string) => string;
  readonly recentCommandIds?: readonly string[];
  readonly triggerKind: PagesEditorTriggerKind | null;
  readonly triggerQuery: string | null;
}): readonly PagesEditorMenuItem[] =>
  parameters.triggerKind === 'mention'
    ? buildMentionTriggerItems(
        parameters.schema,
        parameters.mentionCandidates,
        parameters.triggerQuery,
        parameters.nameTheOfferToMakeAPage,
      )
    : buildSlashTriggerItems(
        parameters.commands,
        parameters.triggerQuery,
        parameters.translateCommandLabel,
        parameters.recentCommandIds ?? [],
      );

export const getEditorTriggerEmptyMessageKey = (
  triggerKind: PagesEditorTriggerKind | null,
  isMentionSearchLoading: boolean,
): string => {
  if (triggerKind !== 'mention') return 'noCommands';
  return isMentionSearchLoading ? 'searchingMentionCandidates' : 'noMentionCandidates';
};

export const getEditorTriggerAriaLabelKey = (triggerKind: PagesEditorTriggerKind | null): string =>
  triggerKind === 'mention' ? 'mentionCandidates' : 'slashCommands';
