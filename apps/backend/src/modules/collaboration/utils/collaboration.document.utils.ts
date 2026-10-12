import {
  COLLABORATION_DOCUMENT_FRAGMENT,
  holdPageContentThisVersionCannotRead,
  type PageContent,
  writePageDocumentJsonAsContent,
} from '@neuma/shared';
import { prosemirrorJSONToYXmlFragment, updateYFragment, yXmlFragmentToProseMirrorRootNode } from 'y-prosemirror';
import { Doc, encodeStateAsUpdate } from 'yjs';
import { COLLABORATION_PAGE_DOCUMENT_SCHEMA } from '../constants/collaboration.document.constants';

/** The server seeds each document once; browsers seeding an empty one would write it twice when two open together. */
export const encodePageContentAsCollaborationState = (content: PageContent): Uint8Array => {
  const document = new Doc();
  prosemirrorJSONToYXmlFragment(
    COLLABORATION_PAGE_DOCUMENT_SCHEMA,
    holdPageContentThisVersionCannotRead(content),
    document.getXmlFragment(COLLABORATION_DOCUMENT_FRAGMENT),
  );
  const state = encodeStateAsUpdate(document);
  document.destroy();
  return state;
};

/** Touches only what changed: unchanged blocks stay put so concurrent edits in them merge instead of being lost. */
export const replaceCollaborationDocumentContent = (document: Doc, content: PageContent): void => {
  const replacement = COLLABORATION_PAGE_DOCUMENT_SCHEMA.nodeFromJSON(holdPageContentThisVersionCannotRead(content));
  replacement.check();
  updateYFragment(document, document.getXmlFragment(COLLABORATION_DOCUMENT_FRAGMENT), replacement, {
    isOMark: new Map(),
    mapping: new Map(),
  });
};

export const readCollaborationDocumentContent = (document: Doc): PageContent =>
  writePageDocumentJsonAsContent(
    yXmlFragmentToProseMirrorRootNode(
      document.getXmlFragment(COLLABORATION_DOCUMENT_FRAGMENT),
      COLLABORATION_PAGE_DOCUMENT_SCHEMA,
    ).toJSON(),
  );
