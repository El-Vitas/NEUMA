import { PAGE_DOCUMENT_MARKS, PAGE_DOCUMENT_NODES } from '@neuma/shared';
import { Schema } from 'prosemirror-model';

/** Same page document shape the editor uses; the server needs it to seed and read back the collaborative document. */
export const COLLABORATION_PAGE_DOCUMENT_SCHEMA = new Schema({
  marks: PAGE_DOCUMENT_MARKS,
  nodes: PAGE_DOCUMENT_NODES,
});
