import { describe, expect, it } from 'bun:test';
import { buildTree, getTreeExpandedIds } from '@/shared/lib/tree.lib';
import type { TreeNode, TreeSourceItem } from '@/shared/types/tree.types';

const item = (id: string, parentId: string | null, order: number): TreeSourceItem => ({ id, order, parentId });

const wrapNode = (
  nodeItem: TreeSourceItem,
  children: readonly TreeNode<TreeSourceItem>[],
): TreeNode<TreeSourceItem> => ({
  children,
  item: nodeItem,
});

describe('buildTree', () => {
  it('groups items by parentId and sorts siblings by order', () => {
    const tree = buildTree([item('child', 'root', 1), item('root', null, 2), item('first', null, 1)], wrapNode);

    expect(tree.map((node) => node.item.id)).toEqual(['first', 'root']);
    expect(tree[1]?.children.map((node) => node.item.id)).toEqual(['child']);
  });

  it('returns an empty tree for an empty item list', () => {
    expect(buildTree([], wrapNode)).toEqual([]);
  });
});

describe('getTreeExpandedIds', () => {
  const tree = buildTree([item('child', 'root', 0), item('grandchild', 'child', 0), item('root', null, 0)], wrapNode);
  const getNodeId = (node: TreeNode<TreeSourceItem>): string => node.item.id;
  const getNodeChildren = (node: TreeNode<TreeSourceItem>): readonly TreeNode<TreeSourceItem>[] => node.children;

  it('returns an empty path when nothing is selected', () => {
    expect(getTreeExpandedIds(tree, null, getNodeId, getNodeChildren)).toEqual([]);
  });

  it('returns the ancestor path down to a nested selected id', () => {
    expect(getTreeExpandedIds(tree, 'grandchild', getNodeId, getNodeChildren)).toEqual(['root', 'child', 'grandchild']);
  });

  it('returns a single-element path when the selected id is a root', () => {
    expect(getTreeExpandedIds(tree, 'root', getNodeId, getNodeChildren)).toEqual(['root']);
  });

  it('returns an empty path when the selected id is not in the tree', () => {
    expect(getTreeExpandedIds(tree, 'missing', getNodeId, getNodeChildren)).toEqual([]);
  });
});
