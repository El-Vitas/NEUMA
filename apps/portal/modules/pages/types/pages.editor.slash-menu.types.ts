import type { Command } from 'prosemirror-state';
import type { PageEditorCommandGroup } from './pages.types';

export type PagesEditorTriggerKind = 'mention' | 'slash';

export interface PagesEditorMenuItem {
  readonly group?: PageEditorCommandGroup;
  readonly id: string;
  readonly label: string;
  readonly run: Command;
}

export interface SlashMenuKeyDownOptions {
  readonly event: KeyboardEvent;
  readonly items: readonly PagesEditorMenuItem[];
  readonly onClose: () => void;
  readonly onSelect: (item: PagesEditorMenuItem) => void;
  readonly onSelectedIndexChange: (index: number) => void;
  readonly selectedIndex: number;
}
