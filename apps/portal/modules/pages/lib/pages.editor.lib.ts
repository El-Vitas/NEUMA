import type { Node as EditorDocument } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { pageContentSchema } from '../schemas/pages.schemas';
import type { PageContent, PageEditorCommand } from '../types/pages.types';
import { createPageEditorPlugins } from './pages.editor.commands';
import { pageEditorSchema } from './pages.editor.schema';

export const createEmptyPageContent = (): PageContent => ({
  content: [{ content: [], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

export const createPageEditorState = (content: PageContent): EditorState =>
  EditorState.create({
    doc: pageEditorSchema.nodeFromJSON(content),
    plugins: createPageEditorPlugins(pageEditorSchema),
    schema: pageEditorSchema,
  });

export const serializePageEditorDocument = (document: EditorDocument): PageContent =>
  pageContentSchema.parse({ ...normalizePageEditorJson(document.toJSON()), schemaVersion: 1 });

export const serializePageEditorState = (state: EditorState): PageContent => serializePageEditorDocument(state.doc);

export const isPageEditorReadOnly = (canEdit: boolean): boolean => !canEdit;

export const runPageEditorCommand = (editorView: EditorView, command: PageEditorCommand): boolean =>
  command.run(editorView.state, editorView.dispatch);

const normalizePageEditorJson = (value: unknown): Record<string, unknown> => {
  if (!isPageEditorJsonObject(value)) return {};

  const normalized = Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      key === 'content' ? normalizePageEditorContent(entryValue) : entryValue,
    ]),
  );
  if (isPageEditorContentNode(value.type) && !('content' in value)) normalized.content = [];
  return normalized;
};

const normalizePageEditorContent = (value: unknown): readonly Record<string, unknown>[] =>
  Array.isArray(value) ? value.map((child) => normalizePageEditorJson(child)) : [];

const isPageEditorContentNode = (value: unknown): boolean =>
  typeof value === 'string' && !['code', 'em', 'link', 'strong', 'text'].includes(value);

const isPageEditorJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
