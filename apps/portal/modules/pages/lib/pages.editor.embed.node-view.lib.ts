import type { PageEmbedProvider } from '@company-brain/shared';
import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import {
  PAGE_EDITOR_BLOCK_ALIGN_STYLE_CLASSES,
  PAGE_EDITOR_EMBED_ASPECT_RATIOS,
  PAGE_EDITOR_EMBED_FIGURE_STYLE_CLASS,
  PAGE_EDITOR_EMBED_FRAME_ALLOW,
  PAGE_EDITOR_EMBED_FRAME_STYLE_CLASS,
  PAGE_EDITOR_EMBED_REFUSED_STYLE_CLASS,
} from '../constants/pages.editor.blocks.constants';
import type { PageEditorEmbedLabels } from '../types/pages.editor.embed.types';
import { readPageEmbedFrameUrl } from './pages.editor.embed.lib';
import { framePageBlockWidth } from './pages.editor.width.lib';

/**
 * A link the service cannot show anything of — a channel, a home page, an
 * address that names no video — is drawn as itself and said plainly, rather
 * than as an empty frame nobody can tell apart from a slow one.
 */
const createRefusedEmbed = (node: EditorNode, labels: PageEditorEmbedLabels): NodeView => {
  const said = document.createElement('div');
  const link = document.createElement('a');
  said.className = PAGE_EDITOR_EMBED_REFUSED_STYLE_CLASS;
  said.dataset.pageEmbedRefused = 'true';
  said.contentEditable = 'false';
  link.href = node.attrs.url;
  link.rel = 'noopener noreferrer';
  link.target = '_blank';
  link.textContent = node.attrs.url;
  said.append(labels.refused, ' ', link);
  return { dom: said, ignoreMutation: () => true, stopEvent: () => true };
};

/**
 * Renders what another service holds, inside the page that points at it.
 *
 * The frame is given only what it needs to play and nothing else — no access to
 * the page around it — and it is sized like an image or a player: by its edge,
 * as a share of the column.
 */
export const createPageEmbedNodeView = (
  node: EditorNode,
  view: EditorView,
  getPosition: () => number | undefined,
  labels: PageEditorEmbedLabels,
): NodeView => {
  const provider = node.attrs.provider as PageEmbedProvider;
  const shown = readPageEmbedFrameUrl(provider, node.attrs.url);
  if (shown === null) return createRefusedEmbed(node, labels);

  const figure = document.createElement('figure');
  const frameHolder = document.createElement('div');
  const frame = document.createElement('iframe');

  figure.dataset.pageEmbed = provider;
  figure.contentEditable = 'false';
  frameHolder.className = PAGE_EDITOR_EMBED_FRAME_STYLE_CLASS;
  frame.src = shown;
  frame.title = `${labels.providers[provider] ?? provider} · ${node.attrs.url}`;
  frame.allow = PAGE_EDITOR_EMBED_FRAME_ALLOW;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.allowFullscreen = true;
  frame.className = 'h-full w-full border-0';
  frameHolder.style.aspectRatio = PAGE_EDITOR_EMBED_ASPECT_RATIOS[provider] ?? PAGE_EDITOR_EMBED_ASPECT_RATIOS.youtube;
  frameHolder.append(frame);

  const { frame: sized, showWidth } = framePageBlockWidth(frameHolder, figure, labels.resize, (width) => {
    const position = getPosition();
    if (position === undefined) return;
    view.dispatch(view.state.tr.setNodeAttribute(position, 'width', width));
  });

  const showEmbed = (current: EditorNode): void => {
    figure.className = `${PAGE_EDITOR_EMBED_FIGURE_STYLE_CLASS} ${
      PAGE_EDITOR_BLOCK_ALIGN_STYLE_CLASSES[String(current.attrs.align)] ?? PAGE_EDITOR_BLOCK_ALIGN_STYLE_CLASSES.left
    }`;
    if (typeof current.attrs.align === 'string') figure.dataset.align = current.attrs.align;
    else figure.removeAttribute('data-align');
    showWidth(typeof current.attrs.width === 'number' ? current.attrs.width : 1);
  };

  figure.append(sized);
  showEmbed(node);

  return {
    dom: figure,
    ignoreMutation: () => true,
    stopEvent: () => true,
    update: (updatedNode) => {
      if (updatedNode.type !== node.type) return false;
      if (updatedNode.attrs.url !== node.attrs.url) return false;
      showEmbed(updatedNode);
      return true;
    },
  };
};
