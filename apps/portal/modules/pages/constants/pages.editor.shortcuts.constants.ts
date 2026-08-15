import { chainCommands, toggleMark } from 'prosemirror-commands';
import { undoInputRule } from 'prosemirror-inputrules';
import { duplicatePageEditorBlock } from '../lib/pages.editor.block-copy.lib';
import { deletePageEditorBlocks } from '../lib/pages.editor.block-delete.lib';
import { openPageEditorBlockMenu } from '../lib/pages.editor.block-menu.lib';
import { movePageEditorBlockDown, movePageEditorBlockUp } from '../lib/pages.editor.block-move.lib';
import { indentPageEditorCode, outdentPageEditorCode } from '../lib/pages.editor.code.lib';
import { redoPageEditorStep, undoPageEditorStep } from '../lib/pages.editor.history.lib';
import { askForTheLinkField } from '../lib/pages.editor.link.lib';
import { nestPageEditorListItem, unnestPageEditorListItem } from '../lib/pages.editor.list.lib';
import { indentPageEditorBlock, outdentPageEditorBlock } from '../lib/pages.editor.nesting.lib';
import { pageEditorSchema } from '../lib/pages.editor.schema';
import { selectBlockThenDocument, selectEnclosingBlock } from '../lib/pages.editor.selection.lib';
import type { PageEditorShortcut } from '../types/pages.editor.shortcuts.types';

/**
 * Every keystroke the editor answers to, written once.
 *
 * The editor binds this list and the shortcut panel reads it, so a shortcut
 * cannot be bound without being told, nor told without working.
 */
export const PAGE_EDITOR_SHORTCUTS: readonly PageEditorShortcut[] = [
  { binding: 'Mod-b', labelKey: 'bold', run: toggleMark(pageEditorSchema.marks.strong) },
  { binding: 'Mod-i', labelKey: 'italic', run: toggleMark(pageEditorSchema.marks.em) },
  { binding: 'Mod-u', labelKey: 'underline', run: toggleMark(pageEditorSchema.marks.underline) },
  { binding: 'Mod-Shift-s', labelKey: 'strike', run: toggleMark(pageEditorSchema.marks.strike) },
  { binding: 'Mod-e', labelKey: 'code', run: toggleMark(pageEditorSchema.marks.code) },
  { binding: 'Mod-k', labelKey: 'link', run: askForTheLinkField },
  { binding: 'Mod-Shift-ArrowUp', labelKey: 'moveBlockUp', run: movePageEditorBlockUp },
  { binding: 'Mod-Shift-ArrowDown', labelKey: 'moveBlockDown', run: movePageEditorBlockDown },
  {
    binding: 'Tab',
    labelKey: 'indentBlock',
    run: chainCommands(indentPageEditorCode, nestPageEditorListItem, indentPageEditorBlock),
  },
  {
    binding: 'Shift-Tab',
    labelKey: 'outdentBlock',
    run: chainCommands(outdentPageEditorCode, unnestPageEditorListItem, outdentPageEditorBlock),
  },
  { binding: 'Mod-/', labelKey: 'openBlockMenu', run: openPageEditorBlockMenu },
  { binding: 'Mod-d', labelKey: 'duplicateBlock', run: duplicatePageEditorBlock },
  { binding: 'Mod-Shift-Backspace', labelKey: 'deleteBlock', run: deletePageEditorBlocks },
  { binding: 'Escape', labelKey: 'selectBlock', run: selectEnclosingBlock },
  { binding: 'Mod-a', labelKey: 'selectBlockThenPage', run: selectBlockThenDocument },
  /**
   * Undoing right after the writing turned into something answers the turning
   * first: `# ` became a heading, and what was meant was a page that begins
   * with a hash. A step later there is nothing to take back and the usual
   * undoing answers.
   */
  { binding: 'Mod-z', labelKey: 'undo', run: chainCommands(undoInputRule, undoPageEditorStep) },
  { binding: 'Shift-Mod-z', labelKey: 'redo', run: redoPageEditorStep },
];

export const PAGE_EDITOR_MODIFIER_KEY = 'Mod';

export const PAGE_EDITOR_COMMAND_KEY_LABEL = '⌘';

export const PAGE_EDITOR_CONTROL_KEY_LABEL = 'Ctrl';

export const PAGE_EDITOR_SHORTCUT_KEY_STYLE_CLASS =
  'min-w-7 border border-border bg-surface-low px-2 py-1 text-center font-mono text-xs';

export const PAGE_EDITOR_SHORTCUT_KEY_LABELS: Readonly<Record<string, string>> = {
  ArrowDown: '↓',
  ArrowUp: '↑',
  Backspace: '⌫',
  Escape: 'Esc',
  a: 'A',
  d: 'D',
  z: 'Z',
};
