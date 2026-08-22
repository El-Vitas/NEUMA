import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import {
  PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS,
  PAGE_EDITOR_DOCUMENT_ASPECT_RATIO,
  PAGE_EDITOR_DOCUMENT_BAR_STYLE_CLASS,
  PAGE_EDITOR_DOCUMENT_FIGURE_STYLE_CLASS,
  PAGE_EDITOR_DOCUMENT_HEAD_STYLE_CLASS,
  PAGE_EDITOR_DOCUMENT_MIME_TYPE,
  PAGE_EDITOR_DOCUMENT_STYLE_CLASS,
  PAGE_EDITOR_DOCUMENT_UNSIZED_WIDTH,
  PAGE_EDITOR_FILE_ABOUT_STYLE_CLASS,
  PAGE_EDITOR_FILE_NAME_STYLE_CLASS,
  PAGE_EDITOR_FILE_STYLE_CLASS,
  PAGE_EDITOR_MARKS,
} from '../../blocks/constants/pages.editor.blocks.constants';
import { framePageBlockAlignment } from '../../blocks/lib/pages.editor.block-frame.lib';
import { framePageBlockWidth } from '../../blocks/lib/pages.editor.width.lib';
import { askForTheWholeScreen } from '../../lib/pages.editor.asking.lib';
import { createPageMarkButton } from '../../text/lib/pages.editor.marks.lib';
import type { PageEditorDocumentLabels } from '../../types/pages.editor.document.types';
import { describePageFile, readPageFileShape } from './pages.editor.file.lib';

const readFileName = (node: EditorNode): string =>
  typeof node.attrs.caption === 'string' && node.attrs.caption.length > 0 ? node.attrs.caption : node.attrs.assetId;

/**
 * The line a file is named on, which is also the way it comes down.
 *
 * It is asked for by name rather than opened, so a document shown on the page
 * can still be taken away whole with one press.
 */
const createFileLine = (node: EditorNode, className: string, getAssetUrl: (assetId: string) => string): HTMLElement => {
  const link = document.createElement('a');
  const name = document.createElement('span');
  const about = document.createElement('span');

  link.className = className;
  link.href = getAssetUrl(node.attrs.assetId);
  link.rel = 'noopener';
  link.download = readFileName(node);
  link.dataset.pageFile = 'true';
  name.className = PAGE_EDITOR_FILE_NAME_STYLE_CLASS;
  name.textContent = readFileName(node);
  about.className = PAGE_EDITOR_FILE_ABOUT_STYLE_CLASS;
  about.dataset.fileAbout = 'true';
  about.textContent = describePageFile(node.attrs.caption, node.attrs.mimeType, node.attrs.size);
  link.append(name, about);
  return link;
};

/**
 * Renders a document where it stands, with its name and a way down above it.
 *
 * The browser's own viewer draws the pages, turns them, and offers the document
 * to whoever wants to keep it or see it whole: it is the viewer every reader
 * already has, and drawing one here would answer fewer questions than it asks.
 */
const createPageDocumentNodeView = (
  node: EditorNode,
  view: EditorView,
  getPosition: () => number | undefined,
  labels: PageEditorDocumentLabels,
  getAssetUrl: (assetId: string) => string,
): NodeView => {
  const figure = document.createElement('figure');
  const shown = document.createElement('div');
  const viewer = document.createElement('embed');
  const head = document.createElement('div');
  const bar = createFileLine(node, PAGE_EDITOR_DOCUMENT_BAR_STYLE_CLASS, getAssetUrl);
  const wide = createPageMarkButton(
    labels.fullScreen,
    PAGE_EDITOR_MARKS.fullScreen,
    PAGE_EDITOR_BLOCK_BUTTON_STYLE_CLASS,
  );

  figure.dataset.pageDocument = 'true';
  figure.contentEditable = 'false';
  viewer.className = PAGE_EDITOR_DOCUMENT_STYLE_CLASS;
  viewer.type = PAGE_EDITOR_DOCUMENT_MIME_TYPE;
  viewer.src = getAssetUrl(node.attrs.assetId);
  viewer.style.aspectRatio = PAGE_EDITOR_DOCUMENT_ASPECT_RATIO;
  viewer.setAttribute('title', readFileName(node));
  head.className = PAGE_EDITOR_DOCUMENT_HEAD_STYLE_CLASS;
  head.append(bar, wide);
  shown.append(head, viewer);
  wide.addEventListener('click', () => askForTheWholeScreen(shown));

  const { frame, showWidth } = framePageBlockWidth(shown, figure, labels.resize, (width) => {
    const position = getPosition();
    if (position === undefined) return;
    view.dispatch(view.state.tr.setNodeAttribute(position, 'width', width));
  });

  /**
   * The viewer is deaf to the pointer until the block is chosen.
   *
   * It is drawn by the browser itself, outside this page, so while it listens it
   * swallows every press and every hover: the block's own buttons never appear
   * and the document cannot be picked up or moved. Choosing it hands the pointer
   * over, which is also what anyone reading a document is about to do.
   */
  const showViewerListens = (listens: boolean): void => {
    viewer.style.pointerEvents = listens ? 'auto' : 'none';
  };

  const showDocument = (current: EditorNode): void => {
    framePageBlockAlignment(figure, PAGE_EDITOR_DOCUMENT_FIGURE_STYLE_CLASS, current.attrs.align);
    if (typeof current.attrs.width === 'number') showWidth(current.attrs.width);
    else frame.style.width = PAGE_EDITOR_DOCUMENT_UNSIZED_WIDTH;
  };

  figure.append(frame);
  showDocument(node);
  showViewerListens(false);

  return {
    deselectNode: () => showViewerListens(false),
    dom: figure,
    ignoreMutation: () => true,
    selectNode: () => showViewerListens(true),
    /** The name, the way down and the edge are worked here; a press anywhere else picks the block. */
    stopEvent: (event) => event.target instanceof Node && head.contains(event.target),
    /**
     * Only what this block can draw is taken on.
     *
     * A file that stops being shown as a document, or that becomes another file
     * altogether, is handed back to be drawn again: claiming the change and
     * drawing nothing is how a block stays as it was until the page is reloaded.
     */
    update: (updatedNode) => {
      if (updatedNode.type !== node.type) return false;
      if (updatedNode.attrs.assetId !== node.attrs.assetId) return false;
      if (
        readPageFileShape(updatedNode.attrs.display, updatedNode.attrs.caption, updatedNode.attrs.mimeType) !==
        'document'
      ) {
        return false;
      }
      showDocument(updatedNode);
      return true;
    },
  };
};

/**
 * A file on a page: a line that brings it down, or — when the page can show it
 * where it stands — the thing itself, read among the writing.
 */
export const createPageFileNodeView = (
  node: EditorNode,
  view: EditorView,
  getPosition: () => number | undefined,
  labels: PageEditorDocumentLabels,
  getAssetUrl: (assetId: string) => string,
): NodeView => {
  if (readPageFileShape(node.attrs.display, node.attrs.caption, node.attrs.mimeType) === 'line') {
    return { dom: createFileLine(node, PAGE_EDITOR_FILE_STYLE_CLASS, getAssetUrl) };
  }
  return createPageDocumentNodeView(node, view, getPosition, labels, getAssetUrl);
};
