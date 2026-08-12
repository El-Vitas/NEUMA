import type { Command } from 'prosemirror-state';
import {
  PAGE_EDITOR_COMMAND_KEY_LABEL,
  PAGE_EDITOR_CONTROL_KEY_LABEL,
  PAGE_EDITOR_MODIFIER_KEY,
  PAGE_EDITOR_SHORTCUT_KEY_LABELS,
} from '../constants/pages.editor.shortcuts.constants';
import type { PageEditorShortcut, PageEditorShortcutKeys } from '../types/pages.editor.shortcuts.types';

export const createPageEditorShortcutBindings = (
  shortcuts: readonly PageEditorShortcut[],
): Readonly<Record<string, Command>> =>
  Object.fromEntries(shortcuts.map((shortcut) => [shortcut.binding, shortcut.run]));

const readKeyLabel = (key: string, usesCommandKey: boolean): string => {
  if (key !== PAGE_EDITOR_MODIFIER_KEY) return PAGE_EDITOR_SHORTCUT_KEY_LABELS[key] ?? key;
  return usesCommandKey ? PAGE_EDITOR_COMMAND_KEY_LABEL : PAGE_EDITOR_CONTROL_KEY_LABEL;
};

/**
 * Turns a binding into the keys a person sees, naming the modifier the way
 * their keyboard does.
 */
export const readPageEditorShortcutKeys = (
  shortcut: PageEditorShortcut,
  usesCommandKey: boolean,
): PageEditorShortcutKeys => ({
  binding: shortcut.binding,
  keys: shortcut.binding.split('-').map((key) => readKeyLabel(key, usesCommandKey)),
  labelKey: shortcut.labelKey,
});
