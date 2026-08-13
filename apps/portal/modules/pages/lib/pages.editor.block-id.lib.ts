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

/**
 * Hands out an identity to every block that lacks one, riding along with the
 * change that created it.
 *
 * It travels as part of that change rather than as one of its own: the history
 * of a page written alone puts appended work in the same step it came with, and
 * the history of a page written together is told, once, whether the whole step
 * belongs there — so a step marked as not worth remembering would take the
 * writing with it.
 */
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
      return transaction;
    },
  });
