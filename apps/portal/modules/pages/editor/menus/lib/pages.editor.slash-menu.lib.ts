import type { Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { PagePersonOption } from '../../../collections/types/pages.schema.types';
import { foldPageLookingText } from '../../../links/lib/pages.looking.lib';
import type { PageMentionCandidate } from '../../../links/types/pages.mentions.types';
import type { PageEditorCommand } from '../../../types/pages.types';
import { PAGE_EDITOR_MENTION_CREATION_ITEM_ID } from '../../blocks/constants/pages.editor.blocks.constants';
import { createPageMentionInsertCommand } from '../../lib/pages.editor.commands';
import { askToMakeTheNamedPage } from '../../lib/pages.editor.mention.lib';
import { createPageDateInsertCommand, createPageDatePickCommand } from '../../text/lib/pages.editor.date.lib';
import { buildEmojiTriggerItems } from '../../text/lib/pages.editor.emoji.lib';
import { createPagePersonInsertCommand } from '../../text/lib/pages.editor.person.lib';
import type { PageEditorDayOffer } from '../../text/types/pages.editor.date.types';
import {
  PAGE_EDITOR_EMOJI_QUERY_PATTERN,
  PAGE_EDITOR_MENTION_QUERY_PATTERN,
  PAGE_EDITOR_SLASH_QUERY_PATTERN,
} from '../constants/pages.editor.slash-menu.constants';
import type {
  PagesEditorMenuItem,
  PagesEditorTrigger,
  PagesEditorTriggerKind,
  SlashMenuKeyDownOptions,
} from '../types/pages.editor.slash-menu.types';

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

export const getSlashMenuQuery = (text: string): string | null =>
  PAGE_EDITOR_SLASH_QUERY_PATTERN.exec(text)?.[1] ?? null;

export const getMentionMenuQuery = (text: string): string | null =>
  PAGE_EDITOR_MENTION_QUERY_PATTERN.exec(text)?.[1] ?? null;

export const getEmojiMenuQuery = (text: string): string | null =>
  PAGE_EDITOR_EMOJI_QUERY_PATTERN.exec(text)?.[1] ?? null;

export const resolveEditorTrigger = (text: string): PagesEditorTrigger | null => {
  const slashQuery = getSlashMenuQuery(text);
  if (slashQuery !== null) return { kind: 'slash', query: slashQuery };

  const mentionQuery = getMentionMenuQuery(text);
  if (mentionQuery !== null) return { kind: 'mention', query: mentionQuery };

  const emojiQuery = getEmojiMenuQuery(text);
  if (emojiQuery !== null) return { kind: 'emoji', query: emojiQuery };

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

const buildPageMentionItems = (
  schema: Schema,
  mentionCandidates: readonly PageMentionCandidate[],
): readonly PagesEditorMenuItem[] =>
  mentionCandidates.map((candidate) => ({
    id: candidate.id,
    label: candidate.label,
    run: createPageMentionInsertCommand(schema, {
      label: candidate.label,
      pageId: candidate.id,
      spaceId: candidate.spaceId,
    }),
  }));

/** Told apart from a page once it is written, by the mark it carries rather than by anything shown here. */
const buildPersonMentionItems = (
  schema: Schema,
  personCandidates: readonly PagePersonOption[],
): readonly PagesEditorMenuItem[] =>
  personCandidates.map((candidate) => ({
    id: `person-${candidate.id}`,
    label: candidate.name,
    run: createPagePersonInsertCommand(schema, { label: candidate.name, userId: candidate.id }),
  }));

const answersToTheDayName = (label: string, query: string): boolean =>
  query.length === 0 || foldPageLookingText(label).includes(foldPageLookingText(query));

/** The one day offered for picking opens its own calendar the moment it lands; the rest are written outright. */
const chooseDayCommand = (schema: Schema, offer: PageEditorDayOffer): Command =>
  offer.labelKey === 'pick'
    ? createPageDatePickCommand(schema, { at: offer.at })
    : createPageDateInsertCommand(schema, { at: offer.at });

const buildDayMentionItems = (
  schema: Schema,
  dayOffers: readonly PageEditorDayOffer[],
  translateDayLabel: (labelKey: PageEditorDayOffer['labelKey']) => string,
  triggerQuery: string | null,
): readonly PagesEditorMenuItem[] => {
  const wanted = triggerQuery?.trim() ?? '';
  return dayOffers
    .map((offer) => ({ label: translateDayLabel(offer.labelKey), offer }))
    .filter(({ label }) => answersToTheDayName(label, wanted))
    .map(({ label, offer }) => ({ id: `date-${offer.id}`, label, run: chooseDayCommand(schema, offer) }));
};

/**
 * How close an answer sits to what was typed: an exact match first, then
 * whichever starts the same way, then whatever merely contains it — so pages,
 * people, and days sort by the same rule instead of by which kind they are.
 */
const rankAgainstQuery = (label: string, query: string): number => {
  const foldedQuery = foldPageLookingText(query);
  if (foldedQuery.length === 0) return 0;
  const foldedLabel = foldPageLookingText(label);
  if (foldedLabel === foldedQuery) return 0;
  return foldedLabel.startsWith(foldedQuery) ? 1 : 2;
};

const byHowCloseToQuery =
  (query: string) =>
  (left: PagesEditorMenuItem, right: PagesEditorMenuItem): number =>
    rankAgainstQuery(left.label, query) - rankAgainstQuery(right.label, query);

/**
 * Everyone and everything that answers to what was typed after `@`: the
 * pages named that way, the members of this space called that, and the days
 * that go by that name — closest first, whichever kind they are — and, when
 * none of them is called exactly that, the offer to make the page that was
 * named.
 */
const buildMentionTriggerItems = (parameters: {
  readonly canMakeAPage: boolean;
  readonly dayOffers: readonly PageEditorDayOffer[];
  readonly mentionCandidates: readonly PageMentionCandidate[];
  readonly nameTheOfferToMakeAPage: (title: string) => string;
  readonly personCandidates: readonly PagePersonOption[];
  readonly schema: Schema;
  readonly translateDayLabel: (labelKey: PageEditorDayOffer['labelKey']) => string;
  readonly triggerQuery: string | null;
}): readonly PagesEditorMenuItem[] => {
  const wanted = parameters.triggerQuery?.trim() ?? '';
  const found = [
    ...buildPageMentionItems(parameters.schema, parameters.mentionCandidates),
    ...buildPersonMentionItems(parameters.schema, parameters.personCandidates),
    ...buildDayMentionItems(
      parameters.schema,
      parameters.dayOffers,
      parameters.translateDayLabel,
      parameters.triggerQuery,
    ),
  ].sort(byHowCloseToQuery(wanted));

  if (!parameters.canMakeAPage || wanted.length === 0 || isAlreadyWritten(parameters.mentionCandidates, wanted)) {
    return found;
  }
  return [
    ...found,
    {
      id: PAGE_EDITOR_MENTION_CREATION_ITEM_ID,
      label: parameters.nameTheOfferToMakeAPage(wanted),
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
  readonly dayOffers: readonly PageEditorDayOffer[];
  readonly mentionCandidates: readonly PageMentionCandidate[];
  readonly personCandidates: readonly PagePersonOption[];
  readonly schema: Schema;
  readonly translateCommandLabel: (labelKey: string) => string;
  readonly translateDayLabel: (labelKey: PageEditorDayOffer['labelKey']) => string;
  readonly nameTheOfferToMakeAPage: (title: string) => string;
  /** Whether this page is written yet, since a page can only be made hanging from one that exists. */
  readonly canMakeAPage: boolean;
  readonly recentCommandIds?: readonly string[];
  readonly triggerKind: PagesEditorTriggerKind | null;
  readonly triggerQuery: string | null;
}): readonly PagesEditorMenuItem[] => {
  switch (parameters.triggerKind) {
    case 'mention':
      return buildMentionTriggerItems({
        canMakeAPage: parameters.canMakeAPage,
        dayOffers: parameters.dayOffers,
        mentionCandidates: parameters.mentionCandidates,
        nameTheOfferToMakeAPage: parameters.nameTheOfferToMakeAPage,
        personCandidates: parameters.personCandidates,
        schema: parameters.schema,
        translateDayLabel: parameters.translateDayLabel,
        triggerQuery: parameters.triggerQuery,
      });
    case 'emoji':
      return buildEmojiTriggerItems(parameters.triggerQuery);
    default:
      return buildSlashTriggerItems(
        parameters.commands,
        parameters.triggerQuery,
        parameters.translateCommandLabel,
        parameters.recentCommandIds ?? [],
      );
  }
};

export const getEditorTriggerEmptyMessageKey = (
  triggerKind: PagesEditorTriggerKind | null,
  isMentionSearchLoading: boolean,
): string => {
  switch (triggerKind) {
    case 'mention':
      return isMentionSearchLoading ? 'searchingMentionCandidates' : 'noMentionCandidates';
    case 'emoji':
      return 'emoji.none';
    default:
      return 'noCommands';
  }
};

export const getEditorTriggerAriaLabelKey = (triggerKind: PagesEditorTriggerKind | null): string => {
  switch (triggerKind) {
    case 'mention':
      return 'mentionCandidates';
    case 'emoji':
      return 'emoji.candidates';
    default:
      return 'slashCommands';
  }
};
