import type { Schema } from 'prosemirror-model';
import type {
  PagesEditorMenuItem,
  PagesEditorTriggerKind,
  SlashMenuKeyDownOptions,
} from '../types/pages.editor.slash-menu.types';
import type { PageMentionCandidate } from '../types/pages.mentions.types';
import type { PageEditorCommand } from '../types/pages.types';
import { createPageMentionInsertCommand } from './pages.editor.commands';

const slashQueryPattern = /(?:^|\s)\/([^\s/]*)$/;
const mentionQueryPattern = /(?:^|\s)@([^\s]*)$/;

export const getSlashMenuQuery = (text: string): string | null => slashQueryPattern.exec(text)?.[1] ?? null;

export const getMentionMenuQuery = (text: string): string | null => mentionQueryPattern.exec(text)?.[1] ?? null;

export const resolveEditorTrigger = (
  text: string,
): { readonly kind: PagesEditorTriggerKind; readonly query: string } | null => {
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

const buildMentionTriggerItems = (
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
    if (!label.toLocaleLowerCase().includes(normalizedQuery)) return items;
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
  readonly recentCommandIds?: readonly string[];
  readonly triggerKind: PagesEditorTriggerKind | null;
  readonly triggerQuery: string | null;
}): readonly PagesEditorMenuItem[] =>
  parameters.triggerKind === 'mention'
    ? buildMentionTriggerItems(parameters.schema, parameters.mentionCandidates)
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
