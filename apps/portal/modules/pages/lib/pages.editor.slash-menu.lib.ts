import type { Schema } from 'prosemirror-model';
import type {
  PagesEditorMenuItem,
  PagesEditorTriggerKind,
  SlashMenuKeyDownOptions,
} from '../types/pages.editor.slash-menu.types';
import type { PageMentionCandidate } from '../types/pages.mentions.types';
import type { PageEditorCommand } from '../types/pages.types';
import { createPageMentionInsertCommand } from './pages.editor.commands';

const slashQueryPattern = /(?:^|\s)\/([^\s]*)$/;
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
  onSelect(item.run);
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

const buildSlashTriggerItems = (
  commands: Readonly<Record<string, PageEditorCommand>>,
  triggerQuery: string | null,
  translateCommandLabel: (labelKey: string) => string,
): readonly PagesEditorMenuItem[] => {
  const normalizedQuery = triggerQuery?.toLocaleLowerCase() ?? '';
  return Object.entries(commands)
    .filter(([, command]) => translateCommandLabel(command.labelKey).toLocaleLowerCase().includes(normalizedQuery))
    .map(([commandName, command]) => ({
      id: commandName,
      label: translateCommandLabel(command.labelKey),
      run: command.run,
    }));
};

export const buildEditorTriggerItems = (parameters: {
  readonly commands: Readonly<Record<string, PageEditorCommand>>;
  readonly mentionCandidates: readonly PageMentionCandidate[];
  readonly schema: Schema;
  readonly translateCommandLabel: (labelKey: string) => string;
  readonly triggerKind: PagesEditorTriggerKind | null;
  readonly triggerQuery: string | null;
}): readonly PagesEditorMenuItem[] =>
  parameters.triggerKind === 'mention'
    ? buildMentionTriggerItems(parameters.schema, parameters.mentionCandidates)
    : buildSlashTriggerItems(parameters.commands, parameters.triggerQuery, parameters.translateCommandLabel);

export const getEditorTriggerEmptyMessageKey = (
  triggerKind: PagesEditorTriggerKind | null,
  isMentionSearchLoading: boolean,
): string => {
  if (triggerKind !== 'mention') return 'noCommands';
  return isMentionSearchLoading ? 'searchingMentionCandidates' : 'noMentionCandidates';
};

export const getEditorTriggerAriaLabelKey = (triggerKind: PagesEditorTriggerKind | null): string =>
  triggerKind === 'mention' ? 'mentionCandidates' : 'slashCommands';
