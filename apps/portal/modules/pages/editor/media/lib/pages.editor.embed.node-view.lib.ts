import type { PageEmbedProvider } from '@company-brain/shared';
import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import {
  PAGE_EDITOR_EMBED_ASPECT_RATIOS,
  PAGE_EDITOR_EMBED_FIGURE_STYLE_CLASS,
  PAGE_EDITOR_EMBED_FRAME_ALLOW,
  PAGE_EDITOR_EMBED_FRAME_STYLE_CLASS,
  PAGE_EDITOR_EMBED_REFUSED_STYLE_CLASS,
} from '../../blocks/constants/pages.editor.blocks.constants';
import { framePageBlockAlignment } from '../../blocks/lib/pages.editor.block-frame.lib';
import { framePageBlockWidth } from '../../blocks/lib/pages.editor.width.lib';
import type { PageEditorEmbedLabels } from '../types/pages.editor.embed.types';
import { readPageEmbedFrameUrl } from './pages.editor.embed.lib';

/** Shows the link as text when it has nothing to embed (channel, home page), not an empty frame that looks loading. */
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
    framePageBlockAlignment(figure, PAGE_EDITOR_EMBED_FIGURE_STYLE_CLASS, current.attrs.align);
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
