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
  bold: { label: 'Negrita', run: toggleMark(schema.marks.strong) },
  blockquote: { label: 'Cita', run: wrapIn(schema.nodes.blockquote) },
  bulletList: { label: 'Lista con viñetas', run: wrapInList(schema.nodes.bullet_list) },
  code: { label: 'Código en línea', run: toggleMark(schema.marks.code) },
  codeBlock: { label: 'Bloque de código', run: setBlockType(schema.nodes.code_block) },
  heading: { label: 'Título', run: setBlockType(schema.nodes.heading, { level: 2 }) },
  italic: { label: 'Cursiva', run: toggleMark(schema.marks.em) },
  orderedList: { label: 'Lista numerada', run: wrapInList(schema.nodes.ordered_list) },
  redo: { label: 'Rehacer', run: redo },
  undo: { label: 'Deshacer', run: undo },
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
