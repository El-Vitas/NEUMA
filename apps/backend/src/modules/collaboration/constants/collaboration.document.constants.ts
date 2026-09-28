import { PAGE_DOCUMENT_MARKS, PAGE_DOCUMENT_NODES } from '@company-brain/shared';
import { Schema } from 'prosemirror-model';

/**
 * La forma del documento de una página, la misma que usa el editor. El servidor
 * la necesita para sembrar el documento colaborativo y para leerlo de vuelta.
 */
export const COLLABORATION_PAGE_DOCUMENT_SCHEMA = new Schema({
  marks: PAGE_DOCUMENT_MARKS,
  nodes: PAGE_DOCUMENT_NODES,
});
