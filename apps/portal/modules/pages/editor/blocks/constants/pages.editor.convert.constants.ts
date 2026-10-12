import type { PageEditorBlockLines, PageEditorBlockTarget } from '../types/pages.editor.convert.types';
import {
  PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE,
  PAGE_EDITOR_COLUMN_ROW_TYPE,
  PAGE_EDITOR_COLUMN_TYPE,
  PAGE_EDITOR_NESTED_BLOCK_TYPE,
  PAGE_EDITOR_TOGGLE_TYPE,
} from './pages.editor.blocks.constants';

/** In menu order. The shape is all a target declares, so adding a type here is enough to convert to and from it. */
export const PAGE_EDITOR_BLOCK_TARGETS: readonly PageEditorBlockTarget[] = [
  { id: 'paragraph', labelKey: 'paragraph', shape: { kind: 'textblock', type: 'paragraph' } },
  { id: 'heading1', labelKey: 'heading1', shape: { attrs: { level: 1 }, kind: 'textblock', type: 'heading' } },
  { id: 'heading2', labelKey: 'heading2', shape: { attrs: { level: 2 }, kind: 'textblock', type: 'heading' } },
  { id: 'heading3', labelKey: 'heading3', shape: { attrs: { level: 3 }, kind: 'textblock', type: 'heading' } },
  { id: 'bulletList', labelKey: 'bulletList', shape: { itemType: 'list_item', kind: 'list', type: 'bullet_list' } },
  { id: 'orderedList', labelKey: 'orderedList', shape: { itemType: 'list_item', kind: 'list', type: 'ordered_list' } },
  { id: 'taskList', labelKey: 'taskList', shape: { itemType: 'task_item', kind: 'list', type: 'task_list' } },
  { id: 'blockquote', labelKey: 'blockquote', shape: { kind: 'holder', type: 'blockquote' } },
  { id: 'callout', labelKey: 'callout', shape: { kind: 'holder', type: 'callout' } },
  { id: 'codeBlock', labelKey: 'codeBlock', shape: { kind: 'textblock', type: 'code_block' } },
];

/** Blocks whose arrangement is their content: reading lines out of them would lose the block itself. */
export const PAGE_EDITOR_ARRANGEMENT_BLOCK_TYPES: readonly string[] = [
  'table',
  'table_row',
  PAGE_EDITOR_COLUMN_ROW_TYPE,
  PAGE_EDITOR_COLUMN_TYPE,
];

export const PAGE_EDITOR_CARRIED_BLOCK_ATTRS: readonly string[] = [
  'id',
  'textColor',
  'backgroundColor',
  PAGE_EDITOR_BLOCK_COMMENTS_ATTRIBUTE,
];

export const PAGE_EDITOR_BLOCKS_BEYOND_THEIR_LINES: readonly string[] = [
  PAGE_EDITOR_NESTED_BLOCK_TYPE,
  PAGE_EDITOR_TOGGLE_TYPE,
];

export const PAGE_EDITOR_NOTHING_TO_CARRY: PageEditorBlockLines = { keepsEverything: false, lines: [] };
