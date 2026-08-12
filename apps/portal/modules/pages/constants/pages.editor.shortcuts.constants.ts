import { redo, undo } from 'prosemirror-history';
import { movePageEditorBlockDown, movePageEditorBlockUp } from '../lib/pages.editor.block-move.lib';
import { indentPageEditorBlock, outdentPageEditorBlock } from '../lib/pages.editor.nesting.lib';
import { selectBlockThenDocument, selectEnclosingBlock } from '../lib/pages.editor.selection.lib';
import type { PageEditorShortcut } from '../types/pages.editor.shortcuts.types';

/**
 * Every keystroke the editor answers to, written once.
 *
 * The editor binds this list and the shortcut panel reads it, so a shortcut
 * cannot be bound without being told, nor told without working.
 */
export const PAGE_EDITOR_SHORTCUTS: readonly PageEditorShortcut[] = [
  { binding: 'Mod-Shift-ArrowUp', labelKey: 'moveBlockUp', run: movePageEditorBlockUp },
  { binding: 'Mod-Shift-ArrowDown', labelKey: 'moveBlockDown', run: movePageEditorBlockDown },
  { binding: 'Tab', labelKey: 'indentBlock', run: indentPageEditorBlock },
  { binding: 'Shift-Tab', labelKey: 'outdentBlock', run: outdentPageEditorBlock },
  { binding: 'Escape', labelKey: 'selectBlock', run: selectEnclosingBlock },
  { binding: 'Mod-a', labelKey: 'selectBlockThenPage', run: selectBlockThenDocument },
  { binding: 'Mod-z', labelKey: 'undo', run: undo },
  { binding: 'Shift-Mod-z', labelKey: 'redo', run: redo },
];

export const PAGE_EDITOR_MODIFIER_KEY = 'Mod';

export const PAGE_EDITOR_COMMAND_KEY_LABEL = '⌘';

export const PAGE_EDITOR_CONTROL_KEY_LABEL = 'Ctrl';

export const PAGE_EDITOR_SHORTCUT_KEY_STYLE_CLASS =
  'min-w-7 border border-border bg-surface-container-low px-2 py-1 text-center font-mono text-xs';

export const PAGE_EDITOR_SHORTCUT_KEY_LABELS: Readonly<Record<string, string>> = {
  ArrowDown: '↓',
  ArrowUp: '↑',
  Escape: 'Esc',
  a: 'A',
  z: 'Z',
};
