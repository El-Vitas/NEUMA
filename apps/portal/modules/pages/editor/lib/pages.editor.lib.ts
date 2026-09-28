import {
  holdPageContentThisVersionCannotRead,
  readPageDocumentJsonAsContent,
  writePageDocumentJsonAsContent,
} from '@company-brain/shared';
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
 * What of the writing the page is able to keep, and nothing when it cannot keep it.
 *
 * The editor lets more be written than a page accepts — a single block longer
 * than the page allows, above all — and asking for it as a value rather than
 * having it thrown is what lets the refusal be said out loud: thrown from the
 * middle of writing it stops nothing visible and saves nothing either, which is
 * a page that quietly stops being kept while somebody keeps writing it.
 */
export const readWhatThePageCanKeep = (state: EditorState): PageContent | null =>
  readPageDocumentJsonAsContent(state.doc.toJSON());

export const isPageEditorReadOnly = (canEdit: boolean): boolean => !canEdit;

/**
 * Puts the cursor at the beginning of the writing.
 *
 * Leaving the title is arriving at the body, so the writing is taken hold of and
 * the cursor placed in its first block rather than the page merely scrolled: the
 * next word typed then lands where the person meant to go.
 */
export const goToTheWritingStart = (editorView: EditorView): void => {
  editorView.focus();
  editorView.dispatch(editorView.state.tr.setSelection(TextSelection.atStart(editorView.state.doc)).scrollIntoView());
};

/** A command is handed the view as well: some of them answer with the page around the writing. */
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

/**
 * Whether the shortcuts should be announced with the command key rather than
 * control. It is read from what the browser says it is, since the platform it
 * runs on is no longer something a page may ask for.
 */
export const usesCommandKeyboard = (userAgent: string): boolean => PAGE_EDITOR_APPLE_USER_AGENT_PATTERN.test(userAgent);
