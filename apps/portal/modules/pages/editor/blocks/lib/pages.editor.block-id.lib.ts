import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorState, Transaction } from 'prosemirror-state';
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

/** Any change makes the page forget the input rule it just applied, so undoing `# ` right after would drop the hash. */
const rememberWhatWasJustWritten = (
  transaction: Transaction,
  writingRules: EditorPlugin,
  state: EditorState,
): Transaction => {
  const remembered: unknown = writingRules.getState(state);
  return remembered === undefined || remembered === null ? transaction : transaction.setMeta(writingRules, remembered);
};

/**
 * Ids are appended to the change that created the block rather than dispatched on their own: a separate step
 * excluded from history would take the writing with it.
 */
export const createPageEditorBlockIdPlugin = (writingRules: EditorPlugin): EditorPlugin =>
  new EditorPlugin({
    appendTransaction: (transactions, _previousState, nextState) => {
      if (!transactions.some((transaction) => transaction.docChanged)) return null;
      const assignments = collectPageEditorBlockIdAssignments(nextState.doc);
      if (assignments.length === 0) return null;

      const transaction = nextState.tr;
      for (const [pos, blockId] of assignments) {
        transaction.setNodeAttribute(pos, 'id', blockId);
      }
      return rememberWhatWasJustWritten(transaction, writingRules, nextState);
    },
  });
