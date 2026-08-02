import { baseKeymap, setBlockType, toggleMark, wrapIn } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { inputRules, textblockTypeInputRule, wrappingInputRule } from 'prosemirror-inputrules';
import { keymap } from 'prosemirror-keymap';
import type { Schema } from 'prosemirror-model';
import { splitListItem, wrapInList } from 'prosemirror-schema-list';
import type { Plugin as EditorPlugin } from 'prosemirror-state';
import type { PageEditorCommand } from '../types/pages.types';

const headingInputRule = /^(#{1,3})\s$/;
const bulletListInputRule = /^\s*([-+*])\s$/;
const orderedListInputRule = /^\s*(\d+)\.\s$/;

export const createPageEditorCommands = (schema: Schema): Readonly<Record<string, PageEditorCommand>> => ({
  bold: { labelKey: 'bold', run: toggleMark(schema.marks.strong) },
  blockquote: { labelKey: 'blockquote', run: wrapIn(schema.nodes.blockquote) },
  bulletList: { labelKey: 'bulletList', run: wrapInList(schema.nodes.bullet_list) },
  code: { labelKey: 'code', run: toggleMark(schema.marks.code) },
  codeBlock: { labelKey: 'codeBlock', run: setBlockType(schema.nodes.code_block) },
  heading: { labelKey: 'heading', run: setBlockType(schema.nodes.heading, { level: 2 }) },
  italic: { labelKey: 'italic', run: toggleMark(schema.marks.em) },
  orderedList: { labelKey: 'orderedList', run: wrapInList(schema.nodes.ordered_list) },
  redo: { labelKey: 'redo', run: redo },
  undo: { labelKey: 'undo', run: undo },
});

export const createPageEditorPlugins = (schema: Schema): readonly EditorPlugin[] => [
  history(),
  inputRules({
    rules: [
      textblockTypeInputRule(headingInputRule, schema.nodes.heading, (match) => ({ level: match[1]?.length ?? 1 })),
      wrappingInputRule(bulletListInputRule, schema.nodes.bullet_list),
      wrappingInputRule(orderedListInputRule, schema.nodes.ordered_list, (match) => ({ order: Number(match[1]) })),
    ],
  }),
  keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Shift-Mod-z': redo }),
  keymap(baseKeymap),
  keymap(Object.fromEntries([['Enter', splitListItem(schema.nodes.list_item)]])),
];
