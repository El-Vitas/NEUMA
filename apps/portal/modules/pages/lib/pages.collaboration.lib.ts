import { EditorState } from 'prosemirror-state';
import { initProseMirrorDoc, ySyncPlugin } from 'y-prosemirror';
import type { XmlFragment } from 'yjs';
import type { CollaborationStatus } from '../types/pages.collaboration.types';
import { createPageEditorPlugins } from './pages.editor.commands';
import { pageEditorSchema } from './pages.editor.schema';

export const createCollaborationDocumentName = (pageId: string): string => `page:${pageId}`;

export const createCollaborationWebSocketUrl = (url: string): string => url;

export const createCollaborativePageEditorState = (fragment: XmlFragment): EditorState => {
  const initializedDocument = initProseMirrorDoc(fragment, pageEditorSchema);
  return EditorState.create({
    doc: initializedDocument.doc,
    plugins: [...createPageEditorPlugins(pageEditorSchema), ySyncPlugin(fragment)],
    schema: pageEditorSchema,
  });
};

export const getCollaborationStatusLabelKey = (status: CollaborationStatus): string => `collaboration.${status}`;
