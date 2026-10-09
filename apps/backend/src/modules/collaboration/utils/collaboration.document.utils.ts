import {
  COLLABORATION_DOCUMENT_FRAGMENT,
  holdPageContentThisVersionCannotRead,
  type PageContent,
  writePageDocumentJsonAsContent,
} from '@company-brain/shared';
import { prosemirrorJSONToYXmlFragment, updateYFragment, yXmlFragmentToProseMirrorRootNode } from 'y-prosemirror';
import { Doc, encodeStateAsUpdate } from 'yjs';
import { COLLABORATION_PAGE_DOCUMENT_SCHEMA } from '../constants/collaboration.document.constants';

/**
 * Lo guardado de una página, escrito como el estado inicial de su documento
 * colaborativo. Lo hace el servidor, una sola vez por documento: si lo hiciera
 * cada navegador al encontrarlo vacío, dos que abren a la vez lo escribirían
 * dos veces.
 */
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

/**
 * Deja el documento colaborativo diciendo exactamente el contenido nuevo,
 * tocando solo lo que cambió: los bloques iguales se quedan donde están, así
 * lo que otra persona escribe al mismo tiempo en ellos se funde en vez de
 * perderse.
 */
export const replaceCollaborationDocumentContent = (document: Doc, content: PageContent): void => {
  const replacement = COLLABORATION_PAGE_DOCUMENT_SCHEMA.nodeFromJSON(holdPageContentThisVersionCannotRead(content));
  replacement.check();
  updateYFragment(document, document.getXmlFragment(COLLABORATION_DOCUMENT_FRAGMENT), replacement, {
    isOMark: new Map(),
    mapping: new Map(),
  });
};

/** Lo que dice el documento colaborativo ahora, en la forma en que se guarda una página. */
export const readCollaborationDocumentContent = (document: Doc): PageContent =>
  writePageDocumentJsonAsContent(
    yXmlFragmentToProseMirrorRootNode(
      document.getXmlFragment(COLLABORATION_DOCUMENT_FRAGMENT),
      COLLABORATION_PAGE_DOCUMENT_SCHEMA,
    ).toJSON(),
  );
