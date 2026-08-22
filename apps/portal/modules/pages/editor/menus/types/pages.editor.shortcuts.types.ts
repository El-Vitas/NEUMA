import type { Command } from 'prosemirror-state';

/**
 * A keystroke the editor answers to.
 *
 * `binding` is written the way ProseMirror reads it, and it is the only place
 * the keystroke is written down: the editor binds it and the shortcut list
 * shows it, so what a person reads is always what the editor obeys.
 */
export interface PageEditorShortcut {
  readonly binding: string;
  readonly labelKey: string;
  readonly run: Command;
}

export interface PageEditorShortcutKeys {
  readonly binding: string;
  readonly keys: readonly string[];
  readonly labelKey: string;
}
