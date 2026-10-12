import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import {
  PAGE_EDITOR_IMAGE_CAPTION_STYLE_CLASS,
  PAGE_EDITOR_IMAGE_FIGURE_STYLE_CLASS,
  PAGE_EDITOR_IMAGE_STYLE_CLASS,
} from '../../blocks/constants/pages.editor.blocks.constants';
import { framePageBlockAlignment } from '../../blocks/lib/pages.editor.block-frame.lib';
import { framePageBlockWidth } from '../../blocks/lib/pages.editor.width.lib';
import type { PageEditorImageLabels } from '../types/pages.editor.image.types';

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

/** The caption doubles as the alt text, so it is entered once. */
export const createPageImageNodeView = (
  node: EditorNode,
  view: EditorView,
  getPosition: () => number | undefined,
  labels: PageEditorImageLabels,
  getAssetUrl: (assetId: string) => string,
): NodeView => {
  const figure = document.createElement('figure');
  const image = document.createElement('img');
  const caption = createCaptionField(node, labels.caption);
  let picture = node;

  const writeAttribute = (name: string, value: number | string | null): void => {
    const position = getPosition();
    if (position === undefined) return;
    view.dispatch(view.state.tr.setNodeAttribute(position, name, value));
  };

  const { frame, handle, showWidth } = framePageBlockWidth(image, figure, labels.resize, (width) =>
    writeAttribute('width', width),
  );

  const showState = (current: EditorNode): void => {
    image.alt = typeof current.attrs.alt === 'string' ? current.attrs.alt : '';
    showWidth(current.attrs.width);
    framePageBlockAlignment(figure, PAGE_EDITOR_IMAGE_FIGURE_STYLE_CLASS, current.attrs.align);
  };

  figure.dataset.pageImage = 'true';
  figure.contentEditable = 'false';
  image.className = PAGE_EDITOR_IMAGE_STYLE_CLASS;
  image.src = getAssetUrl(node.attrs.assetId);
  figure.append(frame, caption);
  showState(node);

  caption.addEventListener('input', () => writeAttribute('alt', caption.value));

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
