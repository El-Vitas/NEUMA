import type { Schema } from 'prosemirror-model';
import { Selection, type Transaction } from 'prosemirror-state';

/** Blocks with no text (divider, collection, subpage) cannot take typing, which would replace them. */
export const leaveSomewhereToWriteUnder = (transaction: Transaction, schema: Schema): Transaction => {
  const afterTheBlock = transaction.selection.to;
  if (afterTheBlock < transaction.doc.content.size) {
    return transaction.setSelection(Selection.near(transaction.doc.resolve(afterTheBlock)));
  }
  transaction.insert(afterTheBlock, schema.nodes.paragraph.createChecked());
  return transaction.setSelection(Selection.near(transaction.doc.resolve(afterTheBlock)));
};
