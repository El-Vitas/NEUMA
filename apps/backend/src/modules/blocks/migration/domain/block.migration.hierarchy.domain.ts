import { BLOCK_MIGRATION_PROBLEM } from '../constants/block.migration.constants';
import type {
  BlockMigrationProblem,
  MigrationHierarchy,
  MigrationPageNode,
  SpaceTree,
} from '../types/block.migration.types';

const compareText = (first: string, second: string): number => {
  if (first < second) return -1;
  return first > second ? 1 : 0;
};

/** Sibling order is `Page.order`, then creation time, then id, so the tree reads the same on every run. */
const compareSiblings = (first: MigrationPageNode, second: MigrationPageNode): number =>
  first.order - second.order ||
  first.createdAt.getTime() - second.createdAt.getTime() ||
  compareText(first.id, second.id);

const groupBy = <Key>(
  nodes: readonly MigrationPageNode[],
  readKey: (node: MigrationPageNode) => Key,
): Map<Key, MigrationPageNode[]> => {
  const groups = new Map<Key, MigrationPageNode[]>();
  for (const node of nodes) {
    const key = readKey(node);
    groups.set(key, [...(groups.get(key) ?? []), node]);
  }
  return groups;
};

const describeCrossSpaceParent = (node: MigrationPageNode): BlockMigrationProblem => ({
  blockId: null,
  kind: BLOCK_MIGRATION_PROBLEM.crossSpaceParent,
  message: `The parent of the page ${node.id} is missing or sits in another space`,
  pageId: node.id,
});

const listCrossSpaceParentProblems = (
  nodes: readonly MigrationPageNode[],
  nodesById: ReadonlyMap<string, MigrationPageNode>,
): BlockMigrationProblem[] =>
  nodes
    .filter((node) => node.parentId !== null && nodesById.get(node.parentId)?.spaceId !== node.spaceId)
    .map(describeCrossSpaceParent);

/** Depth first, so a parent is listed before its children and the children in sibling order. */
const listPreOrder = (
  roots: readonly MigrationPageNode[],
  childrenByParent: ReadonlyMap<string, readonly MigrationPageNode[]>,
): string[] => {
  const ordered: string[] = [];
  const pending = [...roots].reverse();
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    ordered.push(node.id);
    pending.push(...[...(childrenByParent.get(node.id) ?? [])].reverse());
  }
  return ordered;
};

const buildSpaceTree = (
  spaceId: string,
  spaceNodes: readonly MigrationPageNode[],
  childrenByParent: ReadonlyMap<string, readonly MigrationPageNode[]>,
): SpaceTree => {
  const roots = spaceNodes.filter((node) => node.parentId === null).toSorted(compareSiblings);
  return { orderedPageIds: listPreOrder(roots, childrenByParent), spaceId };
};

const describeUnreachable = (pageId: string): BlockMigrationProblem => ({
  blockId: null,
  kind: BLOCK_MIGRATION_PROBLEM.unreachablePage,
  message: `The page ${pageId} cannot be reached from a root page of its space`,
  pageId,
});

/**
 * Orders every page so a parent comes before its children, space by space (by space id). A page whose parent is in
 * another space, or that no root reaches (a cycle), is a problem: a block cannot hang under a parent in another space.
 */
export const buildMigrationHierarchy = (nodes: readonly MigrationPageNode[]): MigrationHierarchy => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const linkedNodes = nodes.filter(
    (node) => node.parentId === null || nodesById.get(node.parentId)?.spaceId === node.spaceId,
  );
  const childrenByParent = new Map(
    [...groupBy(linkedNodes, (node) => node.parentId ?? '')]
      .filter(([parentId]) => parentId !== '')
      .map(([parentId, children]) => [parentId, children.toSorted(compareSiblings)]),
  );
  const spaces = [...groupBy(nodes, (node) => node.spaceId)]
    .toSorted(([first], [second]) => compareText(first, second))
    .map(([spaceId, spaceNodes]) => buildSpaceTree(spaceId, spaceNodes, childrenByParent));
  const reachable = new Set(spaces.flatMap((space) => space.orderedPageIds));
  const crossSpace = listCrossSpaceParentProblems(nodes, nodesById);
  const crossSpaceIds = new Set(crossSpace.map((problem) => problem.pageId));
  const unreachable = nodes
    .filter((node) => !reachable.has(node.id) && !crossSpaceIds.has(node.id))
    .map((node) => describeUnreachable(node.id));
  return {
    childPageIdsByParent: new Map(
      [...childrenByParent].map(([parentId, children]) => [parentId, children.map((child) => child.id)]),
    ),
    problems: [...crossSpace, ...unreachable],
    spaces,
  };
};
