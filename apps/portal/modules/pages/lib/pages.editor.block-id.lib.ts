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

/**
 * Carries over what the page has just turned into.
 *
 * Handing out an identity is a change like any other, and any change makes the
 * page forget the rule it has just answered — so taking a heading back the
 * instant after writing `# ` would take the hash with it, and what was meant
 * was a line that begins with a hash.
 */
const rememberWhatWasJustWritten = (
  transaction: Transaction,
  writingRules: EditorPlugin,
  state: EditorState,
): Transaction => {
  const remembered: unknown = writingRules.getState(state);
  return remembered === undefined || remembered === null ? transaction : transaction.setMeta(writingRules, remembered);
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
