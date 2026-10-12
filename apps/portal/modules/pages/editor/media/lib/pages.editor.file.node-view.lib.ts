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

/** A download link, so a document shown inline can still be saved in one press. */
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

  // The browser viewer swallows pointer events, hiding the block's buttons and blocking drag, until selected.
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
    stopEvent: (event) => event.target instanceof Node && head.contains(event.target),
    // Returns false for changes this view cannot draw (other file, no longer a document) so ProseMirror redraws it.
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
