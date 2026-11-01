import { type BlockRichText, documentToBlocks, type PageContent, Result } from '@neuma/shared';
import { BLOCK_SYNC_SEGMENT_INSERT_KEY } from '../constants/block-sync.constants';
import type { BlockSnapshot, BlockSnapshotMap } from '../types/block-sync.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A list of text segments, which an empty list is too. */
export const isRichTextValue = (value: unknown): value is BlockRichText =>
  Array.isArray(value) && value.every((segment) => isRecord(segment) && BLOCK_SYNC_SEGMENT_INSERT_KEY in segment);

const toSnapshot = (draft: {
  readonly children: readonly string[];
  readonly format: unknown;
  readonly id: string;
  readonly parentId: string | null;
  readonly properties: unknown;
  readonly type: string;
}): BlockSnapshot => ({
  children: draft.children,
  format: isRecord(draft.format) ? draft.format : {},
  id: draft.id,
  parentId: draft.parentId,
  properties: isRecord(draft.properties) ? draft.properties : {},
  type: draft.type,
});

/** The blocks a page document says, by id, the page first. */
export const snapshotContent = (
  content: PageContent,
  pageId: string,
  spaceId: string,
): Result<BlockSnapshotMap, Error> => {
  const converted = documentToBlocks({
    content,
    cover: null,
    icon: null,
    pageId,
    parentId: null,
    propertyValues: null,
    spaceId,
    title: '',
  });
  if (converted.isFail()) return Result.fail(converted.getError());
  const { blocks, page } = converted.getValue();
  const snapshots = new Map<string, BlockSnapshot>();
  for (const draft of [page, ...blocks]) snapshots.set(draft.id, toSnapshot(draft));
  return Result.ok(snapshots);
};
