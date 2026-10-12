import { DOMSerializer, type Node as EditorNode } from 'prosemirror-model';
import type { NodeView } from 'prosemirror-view';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import {
  PAGE_EDITOR_SYNCED_BODY_STYLE_CLASS,
  PAGE_EDITOR_SYNCED_LOST_STYLE_CLASS,
  PAGE_EDITOR_SYNCED_MARK_STYLE_CLASS,
  PAGE_EDITOR_SYNCED_SOURCE_STYLE_CLASS,
  PAGE_EDITOR_SYNCED_STYLE_CLASS,
} from '../../blocks/constants/pages.editor.blocks.constants';
import { pageEditorSchema } from '../../lib/pages.editor.schema';
import type { PageEditorSyncedLabels } from '../types/pages.editor.synced.types';
import { drawBorrowedBlock, isBorrowedDrawing } from './pages.editor.synced.drawing.lib';

/** Read-only: editing happens in the source page, so the same block is never edited from two places. */
export const createPageSyncedNodeView = (
  node: EditorNode,
  labels: PageEditorSyncedLabels,
  readBorrowed: (pageId: string, blockId: string) => EditorNode | null,
): NodeView => {
  const container = document.createElement('div');
  const mark = document.createElement('p');
  const source = document.createElement('a');
  const body = document.createElement('div');

  container.className = PAGE_EDITOR_SYNCED_STYLE_CLASS;
  container.contentEditable = 'false';
  container.dataset.pageSynced = node.attrs.pageId;
  container.dataset.spaceId = node.attrs.spaceId;
  container.dataset.syncedBlock = node.attrs.blockId;
  container.setAttribute('aria-label', labels.synced);

  mark.className = PAGE_EDITOR_SYNCED_MARK_STYLE_CLASS;
  mark.textContent = labels.synced;
  source.className = PAGE_EDITOR_SYNCED_SOURCE_STYLE_CLASS;
  source.href = ROUTES.PORTAL_SPACE_PAGE(node.attrs.spaceId, node.attrs.pageId);
  source.textContent = labels.source;
  mark.append(' · ', source);

  body.className = PAGE_EDITOR_SYNCED_BODY_STYLE_CLASS;
  const borrowed = readBorrowed(node.attrs.pageId, node.attrs.blockId);
  let letGo = (): void => undefined;
  if (borrowed === null) {
    const lost = document.createElement('p');
    lost.className = PAGE_EDITOR_SYNCED_LOST_STYLE_CLASS;
    lost.textContent = labels.lost;
    body.append(lost);
  } else if (isBorrowedDrawing(borrowed)) {
    letGo = drawBorrowedBlock(borrowed, body);
  } else {
    body.append(DOMSerializer.fromSchema(pageEditorSchema).serializeNode(borrowed));
  }

  container.append(mark, body);
  return { destroy: () => letGo(), dom: container, ignoreMutation: () => true, stopEvent: () => true };
};
