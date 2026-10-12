import { chainCommands, toggleMark } from 'prosemirror-commands';
import { undoInputRule } from 'prosemirror-inputrules';
import { duplicatePageEditorBlock } from '../../blocks/lib/pages.editor.block-copy.lib';
import { deletePageEditorBlocks } from '../../blocks/lib/pages.editor.block-delete.lib';
import { openPageEditorBlockMenu } from '../../blocks/lib/pages.editor.block-menu.lib';
import { movePageEditorBlockDown, movePageEditorBlockUp } from '../../blocks/lib/pages.editor.block-move.lib';
import { indentPageEditorBlock, outdentPageEditorBlock } from '../../blocks/lib/pages.editor.nesting.lib';
import { redoPageEditorStep, undoPageEditorStep } from '../../lib/pages.editor.history.lib';
import { pageEditorSchema } from '../../lib/pages.editor.schema';
import { indentPageEditorCode, outdentPageEditorCode } from '../../structure/lib/pages.editor.code.lib';
import { nestPageEditorListItem, unnestPageEditorListItem } from '../../structure/lib/pages.editor.list.lib';
import { askForTheLinkField } from '../../text/lib/pages.editor.link.lib';
import { selectBlockThenDocument, selectEnclosingBlock } from '../../text/lib/pages.editor.selection.lib';
import { askForThePageFind } from '../lib/pages.editor.find.lib';
import type { PageEditorShortcut } from '../types/pages.editor.shortcuts.types';

/** Bound by the editor and listed by the shortcuts dialog, so the two cannot drift apart. */
export const PAGE_EDITOR_SHORTCUTS: readonly PageEditorShortcut[] = [
  { binding: 'Mod-b', labelKey: 'bold', run: toggleMark(pageEditorSchema.marks.strong) },
  { binding: 'Mod-i', labelKey: 'italic', run: toggleMark(pageEditorSchema.marks.em) },
  { binding: 'Mod-u', labelKey: 'underline', run: toggleMark(pageEditorSchema.marks.underline) },
  { binding: 'Mod-Shift-s', labelKey: 'strike', run: toggleMark(pageEditorSchema.marks.strike) },
  { binding: 'Mod-e', labelKey: 'code', run: toggleMark(pageEditorSchema.marks.code) },
  { binding: 'Mod-k', labelKey: 'link', run: askForTheLinkField },
  { binding: 'Mod-f', labelKey: 'find', run: askForThePageFind },
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
  // Undoes an input rule first (`# ` turned into a heading), then the usual step.
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
