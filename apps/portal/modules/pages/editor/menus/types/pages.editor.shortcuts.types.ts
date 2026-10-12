import type { Command } from 'prosemirror-state';

export interface PageEditorShortcut {
  /** ProseMirror key syntax, e.g. `Mod-b`. */
  readonly binding: string;
  readonly labelKey: string;
  readonly run: Command;
}

export interface PageEditorShortcutKeys {
  readonly binding: string;
  readonly keys: readonly string[];
  readonly labelKey: string;
}
