import type { Command } from 'prosemirror-state';
import type { PageEditorCommand } from './pages.types';

export interface SlashMenuKeyDownOptions {
  readonly commands: readonly (readonly [string, PageEditorCommand])[];
  readonly event: KeyboardEvent;
  readonly onClose: () => void;
  readonly onSelect: (command: Command) => void;
  readonly onSelectedIndexChange: (index: number) => void;
  readonly selectedIndex: number;
}
