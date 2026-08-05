import type { TreeSourceItem } from '../types/tree.types';

export const buildTree = <TItem extends TreeSourceItem, TNode>(
  items: readonly TItem[],
  wrapNode: (item: TItem, children: readonly TNode[]) => TNode,
): readonly TNode[] => {
  const childrenByParent = new Map<string | null, TItem[]>();
  for (const item of items) {
    const siblings = childrenByParent.get(item.parentId) ?? [];
    siblings.push(item);
    childrenByParent.set(item.parentId, siblings);
  }

  const buildChildren = (parentId: string | null): readonly TNode[] =>
    (childrenByParent.get(parentId) ?? [])
      .toSorted((left, right) => left.order - right.order)
      .map((item) => wrapNode(item, buildChildren(item.id)));

  return buildChildren(null);
};

export const getTreeExpandedIds = <TNode>(
  tree: readonly TNode[],
  selectedId: string | null,
  getNodeId: (node: TNode) => string,
  getNodeChildren: (node: TNode) => readonly TNode[],
): readonly string[] => {
  if (selectedId === null) return [];
  for (const node of tree) {
    const nodeId = getNodeId(node);
    if (nodeId === selectedId) return [nodeId];
    const childPath = getTreeExpandedIds(getNodeChildren(node), selectedId, getNodeId, getNodeChildren);
    if (childPath.length > 0) return [nodeId, ...childPath];
  }
  return [];
};
