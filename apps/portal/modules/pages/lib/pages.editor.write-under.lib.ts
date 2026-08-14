import type { Schema } from 'prosemirror-model';
import { Selection, type Transaction } from 'prosemirror-state';

/**
 * Leaves somewhere to go on writing under a block that holds nothing.
 *
 * A line, a collection, a page hanging from this one: none of them can be
 * written into, so a page that ends on one has nowhere to put the next word,
 * and whatever is typed next would land on the block itself and replace it.
 */
export const leaveSomewhereToWriteUnder = (transaction: Transaction, schema: Schema): Transaction => {
  const afterTheBlock = transaction.selection.to;
  if (afterTheBlock < transaction.doc.content.size) {
    return transaction.setSelection(Selection.near(transaction.doc.resolve(afterTheBlock)));
  }
  transaction.insert(afterTheBlock, schema.nodes.paragraph.createChecked());
  return transaction.setSelection(Selection.near(transaction.doc.resolve(afterTheBlock)));
};
