import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import {
  PAGE_EDITOR_IMAGE_ALIGN_STYLE_CLASSES,
  PAGE_EDITOR_IMAGE_CAPTION_STYLE_CLASS,
  PAGE_EDITOR_IMAGE_FIGURE_STYLE_CLASS,
  PAGE_EDITOR_IMAGE_HANDLE_STYLE_CLASS,
  PAGE_EDITOR_IMAGE_MINIMUM_WIDTH,
  PAGE_EDITOR_IMAGE_STYLE_CLASS,
} from '../constants/pages.editor.blocks.constants';
import type { PageEditorImageLabels } from '../types/pages.editor.image.types';
import { readPageImageWidth } from './pages.editor.image.lib';

const createCaptionField = (node: EditorNode, label: string): HTMLInputElement => {
  const caption = document.createElement('input');
  caption.type = 'text';
  caption.className = PAGE_EDITOR_IMAGE_CAPTION_STYLE_CLASS;
  caption.dataset.imageCaption = 'true';
  caption.setAttribute('aria-label', label);
  caption.placeholder = label;
  caption.value = typeof node.attrs.alt === 'string' ? node.attrs.alt : '';
  return caption;
};

/**
 * Renders an image with what a page needs to say about it.
 *
 * The one line written under it is both what a reader sees and what is read out
 * to whoever cannot see the image: asking for the same sentence twice is how a
 * page ends up with a caption and an empty alternative text.
 *
 * The width is dragged from the right edge and kept as a share of the page
 * rather than in pixels, so an image reads the same on a screen it was never
 * sized on.
 */
export const createPageImageNodeView = (
  node: EditorNode,
  view: EditorView,
  getPosition: () => number | undefined,
  labels: PageEditorImageLabels,
  getAssetUrl: (assetId: string) => string,
): NodeView => {
  const figure = document.createElement('figure');
  const image = document.createElement('img');
  const handle = document.createElement('button');
  const caption = createCaptionField(node, labels.caption);
  let picture = node;

  const showState = (current: EditorNode): void => {
    image.alt = typeof current.attrs.alt === 'string' ? current.attrs.alt : '';
    /** An image nobody has sized keeps the size it came in at, never stretched to fill the page. */
    if (typeof current.attrs.width === 'number') {
      image.style.width = `${String(Math.round(readPageImageWidth(current.attrs.width) * 100))}%`;
    } else image.style.removeProperty('width');
    figure.className = `${PAGE_EDITOR_IMAGE_FIGURE_STYLE_CLASS} ${
      PAGE_EDITOR_IMAGE_ALIGN_STYLE_CLASSES[String(current.attrs.align)] ?? PAGE_EDITOR_IMAGE_ALIGN_STYLE_CLASSES.left
    }`;
    if (typeof current.attrs.align === 'string') figure.dataset.align = current.attrs.align;
    else figure.removeAttribute('data-align');
  };

  const writeAttribute = (name: string, value: number | string | null): void => {
    const position = getPosition();
    if (position === undefined) return;
    view.dispatch(view.state.tr.setNodeAttribute(position, name, value));
  };

  figure.dataset.pageImage = 'true';
  figure.contentEditable = 'false';
  image.className = PAGE_EDITOR_IMAGE_STYLE_CLASS;
  image.src = getAssetUrl(node.attrs.assetId);
  handle.type = 'button';
  handle.className = PAGE_EDITOR_IMAGE_HANDLE_STYLE_CLASS;
  handle.dataset.imageHandle = 'true';
  handle.setAttribute('aria-label', labels.resize);
  figure.append(image, handle, caption);
  showState(node);

  caption.addEventListener('input', () => writeAttribute('alt', caption.value));

  handle.addEventListener('mousedown', (start) => {
    start.preventDefault();
    const room = figure.getBoundingClientRect().width;
    const from = image.getBoundingClientRect().width;
    if (room === 0) return;

    const follow = (move: MouseEvent): void => {
      const wanted = (from + move.clientX - start.clientX) / room;
      const width = Math.min(Math.max(wanted, PAGE_EDITOR_IMAGE_MINIMUM_WIDTH), 1);
      image.style.width = `${String(Math.round(width * 100))}%`;
    };
    const settle = (): void => {
      figure.ownerDocument.removeEventListener('mousemove', follow);
      figure.ownerDocument.removeEventListener('mouseup', settle);
      writeAttribute('width', Number.parseFloat(image.style.width) / 100);
    };

    figure.ownerDocument.addEventListener('mousemove', follow);
    figure.ownerDocument.addEventListener('mouseup', settle);
  });

  return {
    dom: figure,
    ignoreMutation: () => true,
    stopEvent: (event) => event.target === caption || event.target === handle,
    update: (updatedNode) => {
      if (updatedNode.type !== node.type) return false;
      picture = updatedNode;
      showState(updatedNode);
      if (document.activeElement !== caption && caption.value !== (picture.attrs.alt ?? '')) {
        caption.value = typeof picture.attrs.alt === 'string' ? picture.attrs.alt : '';
      }
      return true;
    },
  };
};
