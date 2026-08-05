import type { Node as EditorNode } from 'prosemirror-model';
import { Plugin as EditorPlugin } from 'prosemirror-state';

export const generatePageEditorBlockId = (): string => crypto.randomUUID();

export const getPageEditorBlockId = (node: EditorNode): string | null =>
  typeof node.attrs.id === 'string' ? node.attrs.id : null;

const hasPageEditorBlockIdAttribute = (node: EditorNode): boolean => 'id' in node.attrs;

export const collectPageEditorBlockIdAssignments = (document: EditorNode): readonly (readonly [number, string])[] => {
  const seenBlockIds = new Set<string>();
  const assignments: (readonly [number, string])[] = [];

  document.descendants((node, pos) => {
    if (!hasPageEditorBlockIdAttribute(node)) return;
    const currentBlockId = getPageEditorBlockId(node);
    if (currentBlockId !== null && !seenBlockIds.has(currentBlockId)) {
      seenBlockIds.add(currentBlockId);
      return;
    }
    const newBlockId = generatePageEditorBlockId();
    seenBlockIds.add(newBlockId);
    assignments.push([pos, newBlockId]);
  });

  return assignments;
};

export const createPageEditorBlockIdPlugin = (): EditorPlugin =>
  new EditorPlugin({
    appendTransaction: (transactions, _previousState, nextState) => {
      if (!transactions.some((transaction) => transaction.docChanged)) return null;
      const assignments = collectPageEditorBlockIdAssignments(nextState.doc);
      if (assignments.length === 0) return null;

      const transaction = nextState.tr;
      for (const [pos, blockId] of assignments) {
        transaction.setNodeAttribute(pos, 'id', blockId);
      }
      transaction.setMeta('addToHistory', false);
      return transaction;
    },
  });
