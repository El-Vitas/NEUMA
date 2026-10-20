import { blocksToDocument, type PageContent, Result } from '@neuma/shared';
import type { BlockSnapshot, BlockSnapshotMap } from '../types/block-sync.types';
import { toStableJson } from './block-sync.text.lib';

export const areSnapshotMapsEqual = (first: BlockSnapshotMap, second: BlockSnapshotMap): boolean => {
  if (first.size !== second.size) return false;
  for (const [id, snapshot] of first) {
    const other = second.get(id);
    if (other === undefined || toStableJson(snapshot) !== toStableJson(other)) return false;
  }
  return true;
};

/**
 * The writer's order of the children, plus the children others added that the writer has not seen: each goes after
 * the sibling that precedes it on the server, or first when there is none. A child the writer removed stays out.
 */
const mergeChildren = (
  local: readonly string[],
  server: readonly string[],
  isRemovedLocally: (blockId: string) => boolean,
): readonly string[] => {
  const merged = [...local];
  for (const [index, childId] of server.entries()) {
    if (merged.includes(childId) || isRemovedLocally(childId)) continue;
    const precedingIndex = merged.findIndex((sibling) => sibling === server[index - 1]);
    merged.splice(precedingIndex + 1, 0, childId);
  }
  return merged;
};

/**
 * The blocks the server knows, except that the blocks in `localIds` are taken as the writer has them. The children
 * of such a block still include what others added to it.
 */
export const overlaySnapshots = (
  known: BlockSnapshotMap,
  local: BlockSnapshotMap,
  localIds: ReadonlySet<string>,
  isRemovedLocally: (blockId: string) => boolean,
): BlockSnapshotMap => {
  const merged = new Map(known);
  for (const id of localIds) {
    const snapshot = local.get(id);
    const serverChildren = known.get(id)?.children ?? [];
    if (snapshot === undefined) merged.delete(id);
    else {
      const isLeftOut = (childId: string): boolean =>
        isRemovedLocally(childId) || (local.has(childId) && local.get(childId)?.parentId !== id);
      merged.set(id, { ...snapshot, children: mergeChildren(snapshot.children, serverChildren, isLeftOut) });
    }
  }
  return merged;
};

/**
 * Whether the server lists the children differently from how they were written: the blocks both lists hold are in
 * another order, or a block just listed is not there. A block someone else added, or removed, is not a difference.
 */
export const findChildrenDivergence = (
  serverChildren: readonly string[],
  localChildren: readonly string[],
  justListed: ReadonlySet<string>,
): boolean => {
  const onServer = new Set(serverChildren);
  const written = new Set(localChildren);
  if ([...justListed].some((childId) => written.has(childId) && !onServer.has(childId))) return true;
  const serverOrder = serverChildren.filter((childId) => written.has(childId));
  const localOrder = localChildren.filter((childId) => onServer.has(childId));
  return serverOrder.some((childId, index) => childId !== localOrder[index]);
};

const keepReachable = (snapshots: BlockSnapshotMap, pageId: string): readonly BlockSnapshot[] => {
  const reachable = new Map<string, BlockSnapshot>();
  const visit = (id: string): void => {
    const snapshot = snapshots.get(id);
    if (snapshot === undefined || reachable.has(id)) return;
    reachable.set(id, snapshot);
    for (const childId of snapshot.children) visit(childId);
  };
  visit(pageId);
  return [...reachable.values()].map((snapshot) => ({
    ...snapshot,
    children: snapshot.children.filter((childId) => reachable.has(childId)),
  }));
};

/** The page document the blocks say. A block nothing lists, or that is listed and missing, is left out. */
export const buildContentFromSnapshots = (snapshots: BlockSnapshotMap, pageId: string): Result<PageContent, Error> => {
  const [page, ...blocks] = keepReachable(snapshots, pageId);
  if (page === undefined) return Result.fail(new Error(`The page block ${pageId} is missing`));
  const content = blocksToDocument(page, blocks);
  return content.isFail() ? Result.fail(content.getError()) : Result.ok(content.getValue());
};
