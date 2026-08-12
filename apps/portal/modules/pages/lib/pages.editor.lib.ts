import type { Node as EditorDocument } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import {
  SELECTION_TOOLBAR_HORIZONTAL_MARGIN_PX,
  SELECTION_TOOLBAR_VERTICAL_GAP_PX,
} from '../constants/pages.editor.constants';
import { pageContentSchema } from '../schemas/pages.schemas';
import type { PageContent, PageEditorCommand } from '../types/pages.types';
import { createPageEditorPlugins } from './pages.editor.commands';
import { pageEditorSchema } from './pages.editor.schema';

export const createEmptyPageContent = (): PageContent => ({
  content: [{ content: [], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
});

export const createPageEditorState = (
  content: PageContent,
  selectBlockLabel: string,
  insertBlockLabel: string = selectBlockLabel,
  blockCommentsLabel: string = selectBlockLabel,
): EditorState =>
  EditorState.create({
    doc: pageEditorSchema.nodeFromJSON(pageContentSchema.parse(content)),
    plugins: createPageEditorPlugins(
      pageEditorSchema,
      selectBlockLabel,
      insertBlockLabel,
      selectBlockLabel,
      blockCommentsLabel,
    ),
    schema: pageEditorSchema,
  });

export const serializePageEditorDocument = (document: EditorDocument): PageContent =>
  pageContentSchema.parse({ ...normalizePageEditorJson(document.toJSON()), schemaVersion: 1 });

export const serializePageEditorState = (state: EditorState): PageContent => serializePageEditorDocument(state.doc);

export const isPageEditorReadOnly = (canEdit: boolean): boolean => !canEdit;

export const runPageEditorCommand = (editorView: EditorView, command: PageEditorCommand): boolean =>
  command.run(editorView.state, editorView.dispatch);

export const computeSelectionToolbarPlacement = (parameters: {
  readonly selectionEndCoords: {
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
    readonly top: number;
  };
  readonly selectionStartCoords: {
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
    readonly top: number;
  };
  readonly surfaceRect: { readonly left: number; readonly top: number; readonly width: number };
  readonly toolbarHeight: number;
  readonly toolbarWidth: number;
}): { readonly left: number; readonly placement: 'above' | 'below'; readonly top: number } => {
  const { selectionEndCoords, selectionStartCoords, surfaceRect, toolbarHeight, toolbarWidth } = parameters;

  const selectionTop = Math.min(selectionStartCoords.top, selectionEndCoords.top);
  const selectionBottom = Math.max(selectionStartCoords.bottom, selectionEndCoords.bottom);
  const selectionLeft = Math.min(selectionStartCoords.left, selectionEndCoords.left);
  const selectionRight = Math.max(selectionStartCoords.right, selectionEndCoords.right);
  const selectionCenterX = (selectionLeft + selectionRight) / 2;

  const spaceAboveSelection = selectionTop - surfaceRect.top;
  const placement: 'above' | 'below' =
    spaceAboveSelection >= toolbarHeight + SELECTION_TOOLBAR_VERTICAL_GAP_PX ? 'above' : 'below';
  const top =
    placement === 'above'
      ? selectionTop - surfaceRect.top - toolbarHeight - SELECTION_TOOLBAR_VERTICAL_GAP_PX
      : selectionBottom - surfaceRect.top + SELECTION_TOOLBAR_VERTICAL_GAP_PX;

  const maxLeft = Math.max(
    surfaceRect.width - toolbarWidth - SELECTION_TOOLBAR_HORIZONTAL_MARGIN_PX,
    SELECTION_TOOLBAR_HORIZONTAL_MARGIN_PX,
  );
  const left = Math.min(
    Math.max(selectionCenterX - surfaceRect.left - toolbarWidth / 2, SELECTION_TOOLBAR_HORIZONTAL_MARGIN_PX),
    maxLeft,
  );

  return { left, placement, top };
};

const normalizePageEditorJson = (value: unknown): Record<string, unknown> => {
  if (!isPageEditorJsonObject(value)) return {};

  const normalized = Object.fromEntries(
    Object.entries(value)
      .map(([key, entryValue]) => [key, normalizePageEditorEntry(key, entryValue)] as const)
      .filter(([key, entryValue]) => !isEmptyNormalizedAttrs(key, entryValue)),
  );
  if (isPageEditorContentNode(value.type) && !('content' in value)) normalized.content = [];
  return normalized;
};

const normalizePageEditorEntry = (key: string, value: unknown): unknown => {
  if (key === 'attrs') return normalizePageEditorAttrs(value);
  if (key === 'content') return normalizePageEditorContent(value);
  return value;
};

const normalizePageEditorContent = (value: unknown): readonly Record<string, unknown>[] =>
  Array.isArray(value) ? value.map((child) => normalizePageEditorJson(child)) : [];

const normalizePageEditorAttrs = (value: unknown): Record<string, unknown> => {
  if (!isPageEditorJsonObject(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== null));
};

const isEmptyNormalizedAttrs = (key: string, value: unknown): boolean =>
  key === 'attrs' && isPageEditorJsonObject(value) && Object.keys(value).length === 0;

const isPageEditorContentNode = (value: unknown): boolean =>
  typeof value === 'string' &&
  !['code', 'collection', 'em', 'embed', 'file', 'image', 'link', 'mention', 'strong', 'text'].includes(value);

const isPageEditorJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
