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

/** The blocks the server knows, except that the blocks in `localIds` are taken as the writer has them. */
export const overlaySnapshots = (
  known: BlockSnapshotMap,
  local: BlockSnapshotMap,
  localIds: ReadonlySet<string>,
): BlockSnapshotMap => {
  const merged = new Map(known);
  for (const id of localIds) {
    const snapshot = local.get(id);
    if (snapshot === undefined) merged.delete(id);
    else merged.set(id, snapshot);
  }
  return merged;
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
