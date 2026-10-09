import {
  holdPageContentThisVersionCannotRead,
  readPageDocumentJsonAsContent,
  writePageDocumentJsonAsContent,
} from '@neuma/shared';
import type { Node as EditorDocument } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { pageContentSchema } from '../../schemas/pages.schemas';
import type { PageContent, PageEditorCommand } from '../../types/pages.types';
import {
  PAGE_EDITOR_APPLE_USER_AGENT_PATTERN,
  SELECTION_TOOLBAR_HORIZONTAL_MARGIN_PX,
  SELECTION_TOOLBAR_VERTICAL_GAP_PX,
} from '../constants/pages.editor.constants';
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
  writeHereLabel = '',
  foldHeadingLabel = '',
  resizeColumnLabel: string = selectBlockLabel,
): EditorState =>
  EditorState.create({
    doc: pageEditorSchema.nodeFromJSON(holdPageContentThisVersionCannotRead(pageContentSchema.parse(content))),
    plugins: createPageEditorPlugins(
      pageEditorSchema,
      selectBlockLabel,
      insertBlockLabel,
      resizeColumnLabel,
      blockCommentsLabel,
      writeHereLabel,
      foldHeadingLabel,
    ),
    schema: pageEditorSchema,
  });

export const serializePageEditorDocument = (document: EditorDocument): PageContent =>
  writePageDocumentJsonAsContent(document.toJSON());

export const serializePageEditorState = (state: EditorState): PageContent => serializePageEditorDocument(state.doc);

/**
 * Returns `null` instead of throwing when the content exceeds what a page accepts (a block that is too long),
 * so the caller can surface the refusal rather than silently stop saving.
 */
export const readWhatThePageCanKeep = (state: EditorState): PageContent | null =>
  readPageDocumentJsonAsContent(state.doc.toJSON());

export const isPageEditorReadOnly = (canEdit: boolean): boolean => !canEdit;

/** Focuses the editor and places the cursor in the first block, so typing after the title lands in the body. */
export const goToTheWritingStart = (editorView: EditorView): void => {
  editorView.focus();
  editorView.dispatch(editorView.state.tr.setSelection(TextSelection.atStart(editorView.state.doc)).scrollIntoView());
};

export const runPageEditorCommand = (editorView: EditorView, command: PageEditorCommand): boolean =>
  command.run(editorView.state, editorView.dispatch, editorView);

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

/** Reads the user agent because `navigator.platform` is deprecated. */
export const usesCommandKeyboard = (userAgent: string): boolean => PAGE_EDITOR_APPLE_USER_AGENT_PATTERN.test(userAgent);
