import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorView, NodeView } from 'prosemirror-view';

const getPageAssetUrl = (assetId: string): string => `/api/page-assets/${encodeURIComponent(assetId)}`;

const createPageFileNodeView = (node: EditorNode): NodeView => {
  const link = document.createElement('a');
  link.className =
    'my-3 flex min-h-11 items-center border border-border bg-surface-container-low px-3 text-sm text-foreground underline-offset-4 hover:underline';
  link.href = getPageAssetUrl(node.attrs.assetId);
  link.rel = 'noopener';
  link.textContent = node.attrs.caption || node.attrs.assetId;
  return { dom: link };
};

const createPageImageNodeView = (node: EditorNode): NodeView => {
  const image = document.createElement('img');
  image.alt = node.attrs.alt || '';
  image.className = 'my-4 h-auto max-w-full';
  image.src = getPageAssetUrl(node.attrs.assetId);
  return { dom: image };
};

export const createPageEditorNodeViews = (): Readonly<
  Record<string, (node: EditorNode, view: EditorView) => NodeView>
> => ({
  file: createPageFileNodeView,
  image: createPageImageNodeView,
});
