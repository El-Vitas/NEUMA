import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';
import {
  PAGE_EDITOR_MEDIA_AUDIO_STYLE_CLASS,
  PAGE_EDITOR_MEDIA_FIGURE_STYLE_CLASS,
  PAGE_EDITOR_MEDIA_PLAYER_STYLE_CLASS,
  PAGE_EDITOR_MEDIA_UNSIZED_WIDTH,
  PAGE_EDITOR_MEDIA_VIDEO_STYLE_CLASS,
} from '../../blocks/constants/pages.editor.blocks.constants';
import { framePageBlockAlignment } from '../../blocks/lib/pages.editor.block-frame.lib';
import { framePageBlockWidth } from '../../blocks/lib/pages.editor.width.lib';
import type { PageEditorMediaLabels } from '../types/pages.editor.media.types';
import { createPageMediaControls } from './pages.editor.media.controls.lib';

const createPlayer = (
  node: EditorNode,
  kind: 'video' | 'audio',
  getAssetUrl: (assetId: string) => string,
): HTMLMediaElement => {
  const player = document.createElement(kind);
  player.preload = 'metadata';
  player.src = getAssetUrl(node.attrs.assetId);
  player.className = kind === 'video' ? PAGE_EDITOR_MEDIA_VIDEO_STYLE_CLASS : PAGE_EDITOR_MEDIA_AUDIO_STYLE_CLASS;
  if (typeof node.attrs.caption === 'string') player.setAttribute('aria-label', node.attrs.caption);
  return player;
};

/**
 * Renders a video or a recording as something that plays where it was put.
 *
 * What is under the controls is a real `<video>` or `<audio>`; what is drawn
 * over it is ours, so a player reads as part of the page instead of as a black
 * box the browser left there.
 *
 * Both take the whole column of writing until someone says otherwise, and both
 * are stretched from the right edge the same way an image is: a player is a
 * control to be worked, and one left at the size its file happened to have is
 * a control nobody asked for.
 */
const createPageMediaNodeView = (
  node: EditorNode,
  kind: 'video' | 'audio',
  view: EditorView,
  getPosition: () => number | undefined,
  labels: PageEditorMediaLabels,
  getAssetUrl: (assetId: string) => string,
): NodeView => {
  const player = createPlayer(node, kind, getAssetUrl);
  const shown = document.createElement('div');
  const figure = document.createElement('figure');

  figure.dataset.pageMedia = kind;
  figure.contentEditable = 'false';
  shown.className = PAGE_EDITOR_MEDIA_PLAYER_STYLE_CLASS;
  shown.append(player, createPageMediaControls(player, labels));

  const { frame, showWidth } = framePageBlockWidth(shown, figure, labels.resize, (width) => {
    const position = getPosition();
    if (position === undefined) return;
    view.dispatch(view.state.tr.setNodeAttribute(position, 'width', width));
  });
  /**
   * Where the player stands and how much of the column it takes.
   *
   * One nobody sized takes the column, but never more of it than the file
   * itself has to show: a small clip blown up to the width of the page is the
   * same clip, only blurred.
   */
  const showMedia = (current: EditorNode): void => {
    framePageBlockAlignment(figure, PAGE_EDITOR_MEDIA_FIGURE_STYLE_CLASS, current.attrs.align);
    if (typeof current.attrs.width === 'number') {
      showWidth(current.attrs.width);
      return;
    }
    showWidth(PAGE_EDITOR_MEDIA_UNSIZED_WIDTH);
    if (player instanceof HTMLVideoElement && player.videoWidth > 0) {
      frame.style.width = `min(100%, ${String(player.videoWidth)}px)`;
    }
  };

  figure.append(frame);
  showMedia(node);
  let media = node;
  player.addEventListener('loadedmetadata', () => showMedia(media));

  return {
    dom: figure,
    ignoreMutation: () => true,
    stopEvent: () => true,
    update: (updatedNode) => {
      if (updatedNode.type !== node.type) return false;
      media = updatedNode;
      showMedia(updatedNode);
      return true;
    },
  };
};

export const createPageVideoNodeView = (
  node: EditorNode,
  view: EditorView,
  getPosition: () => number | undefined,
  labels: PageEditorMediaLabels,
  getAssetUrl: (assetId: string) => string,
): NodeView => createPageMediaNodeView(node, 'video', view, getPosition, labels, getAssetUrl);

export const createPageAudioNodeView = (
  node: EditorNode,
  view: EditorView,
  getPosition: () => number | undefined,
  labels: PageEditorMediaLabels,
  getAssetUrl: (assetId: string) => string,
): NodeView => createPageMediaNodeView(node, 'audio', view, getPosition, labels, getAssetUrl);
