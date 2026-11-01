import type { BlockExpectedVersion, WorkingBlock } from './block.transaction.domain.types';

/** The first block whose version is not the one the writer read, or that is not held at all; null when all match. */
export const findStaleBlock = (
  expected: readonly BlockExpectedVersion[] | undefined,
  locked: readonly WorkingBlock[],
): string | null => {
  const versions = new Map(locked.map((block) => [block.id, block.version]));
  const stale = (expected ?? []).find(({ blockId, version }) => versions.get(blockId) !== version);
  return stale?.blockId ?? null;
};
