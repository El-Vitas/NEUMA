import type { Command } from 'prosemirror-state';

export type PagesEditorTriggerKind = 'mention' | 'slash';

export interface PagesEditorMenuItem {
  readonly id: string;
  readonly label: string;
  readonly run: Command;
}

export interface SlashMenuKeyDownOptions {
  readonly event: KeyboardEvent;
  readonly items: readonly PagesEditorMenuItem[];
  readonly onClose: () => void;
  readonly onSelect: (command: Command) => void;
  readonly onSelectedIndexChange: (index: number) => void;
  readonly selectedIndex: number;
}
