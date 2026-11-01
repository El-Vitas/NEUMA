import type { Node as EditorNode } from 'prosemirror-model';
import { Plugin as EditorPlugin, type EditorState, type Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { pageEditorRestrictedBlocksKey } from '../../lib/pages.editor.plugin-keys.lib';
import {
  PAGE_EDITOR_NOTHING_RESTRICTED,
  PAGE_EDITOR_RESTRICTED_BLOCK_STYLE_CLASS,
  PAGE_EDITOR_RESTRICTED_MARK_ICON_SHAPES,
  PAGE_EDITOR_RESTRICTED_MARK_STYLE_CLASS,
  PAGE_EDITOR_SVG_NAMESPACE,
} from '../constants/pages.editor.blocks.constants';
import type { PageEditorRestrictedBlocks } from '../types/pages.editor.block-restricted.types';
import { getPageEditorBlockId } from './pages.editor.block-id.lib';

export const readPageEditorRestrictedBlocks = (state: EditorState): PageEditorRestrictedBlocks | undefined =>
  pageEditorRestrictedBlocksKey.getState(state);

/** Dispatched from the page when the blocks that declare their own access are known or change. */
export const restrictPageEditorBlocks = (state: EditorState, restricted: PageEditorRestrictedBlocks): Transaction =>
  state.tr.setMeta(pageEditorRestrictedBlocksKey, restricted).setMeta('addToHistory', false);

const createLockIcon = (): SVGElement => {
  const icon = document.createElementNS(PAGE_EDITOR_SVG_NAMESPACE, 'svg');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('class', 'size-3.5 shrink-0');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  icon.setAttribute('stroke-width', '2');
  icon.setAttribute('viewBox', '0 0 24 24');
  for (const shape of PAGE_EDITOR_RESTRICTED_MARK_ICON_SHAPES) {
    const element = document.createElementNS(PAGE_EDITOR_SVG_NAMESPACE, shape.tag);
    for (const [name, value] of Object.entries(shape.attributes)) element.setAttribute(name, value);
    icon.append(element);
  }
  return icon;
};

const createLockMark = (label: string): HTMLElement => {
  const mark = document.createElement('span');
  const words = document.createElement('span');
  mark.className = PAGE_EDITOR_RESTRICTED_MARK_STYLE_CLASS;
  mark.contentEditable = 'false';
  mark.title = label;
  words.className = 'sr-only';
  words.textContent = label;
  mark.append(createLockIcon(), words);
  return mark;
};

const buildLock = (block: EditorNode, blockStart: number, label: string): readonly Decoration[] => [
  Decoration.node(blockStart, blockStart + block.nodeSize, { class: PAGE_EDITOR_RESTRICTED_BLOCK_STYLE_CLASS }),
  Decoration.widget(blockStart + 1, () => createLockMark(label), {
    key: `page-editor-restricted-block-${String(blockStart)}`,
    side: -1,
  }),
];

const collectLocks = (document: EditorNode, restricted: PageEditorRestrictedBlocks): readonly Decoration[] => {
  const locks: Decoration[] = [];
  if (restricted.ids.size === 0) return locks;
  document.descendants((block, blockStart) => {
    const blockId = getPageEditorBlockId(block);
    if (blockId === null || !restricted.ids.has(blockId) || block.isAtom) return;
    locks.push(...buildLock(block, blockStart, restricted.label));
  });
  return locks;
};

const isRestrictedBlocks = (value: unknown): value is PageEditorRestrictedBlocks =>
  typeof value === 'object' && value !== null && 'ids' in value && 'label' in value;

/** A lock beside each block that declares its own access; the page says which, since the document cannot. */
export const createPageEditorRestrictedBlocksPlugin = (): EditorPlugin<PageEditorRestrictedBlocks> =>
  new EditorPlugin<PageEditorRestrictedBlocks>({
    key: pageEditorRestrictedBlocksKey,
    props: {
      decorations: (state) =>
        DecorationSet.create(state.doc, [
          ...collectLocks(state.doc, readPageEditorRestrictedBlocks(state) ?? PAGE_EDITOR_NOTHING_RESTRICTED),
        ]),
    },
    state: {
      apply: (transaction, previous) => {
        const next: unknown = transaction.getMeta(pageEditorRestrictedBlocksKey);
        return isRestrictedBlocks(next) ? next : previous;
      },
      init: () => PAGE_EDITOR_NOTHING_RESTRICTED,
    },
  });
