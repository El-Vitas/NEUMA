import { DOMSerializer, type Node as EditorNode } from 'prosemirror-model';
import type { NodeView } from 'prosemirror-view';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import {
  PAGE_EDITOR_SYNCED_BODY_STYLE_CLASS,
  PAGE_EDITOR_SYNCED_LOST_STYLE_CLASS,
  PAGE_EDITOR_SYNCED_MARK_STYLE_CLASS,
  PAGE_EDITOR_SYNCED_SOURCE_STYLE_CLASS,
  PAGE_EDITOR_SYNCED_STYLE_CLASS,
} from '../constants/pages.editor.blocks.constants';
import type { PageEditorSyncedLabels } from '../types/pages.editor.synced.types';
import { pageEditorSchema } from './pages.editor.schema';

/**
 * Shows a block that lives in another page.
 *
 * It is drawn and not written in: what is read here is what that page says now,
 * and writing it is done where it lives — otherwise the same block would be
 * edited from two places at once and one of the two would lose. It says outright
 * that it is borrowed and where from, because a block that reads as this page's
 * own and cannot be typed into reads as broken.
 */
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
  if (borrowed === null) {
    const lost = document.createElement('p');
    lost.className = PAGE_EDITOR_SYNCED_LOST_STYLE_CLASS;
    lost.textContent = labels.lost;
    body.append(lost);
  } else {
    body.append(DOMSerializer.fromSchema(pageEditorSchema).serializeNode(borrowed));
  }

  container.append(mark, body);
  return { dom: container, ignoreMutation: () => true, stopEvent: () => true };
};
