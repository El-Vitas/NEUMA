import { isSameJson } from '../../../common/domain/json.domain';
import { BLOCK_NOTIFY_PAYLOAD_LIMIT_BYTES } from './block.operation.constants';
import type { BlockVersion, NoticeSource, NotifiedBlock, NotifiedView } from './block.transaction.domain.types';

const hasChangedPermissions = (block: NoticeSource, previous: NoticeSource | undefined): boolean =>
  previous === undefined ? block.permissions !== null : !isSameJson(previous.permissions, block.permissions);

/** Undefined when the block did not move; null when it left the top of its space. */
const findLeftParentId = (block: NoticeSource, previous: NoticeSource | undefined): string | null | undefined =>
  previous === undefined || previous.parentId === block.parentId ? undefined : previous.parentId;

const toNotice = (block: NoticeSource, previous: NoticeSource | undefined): NotifiedBlock => {
  const leftParentId = findLeftParentId(block, previous);
  return {
    ...(hasChangedPermissions(block, previous) ? { hasAccessChange: true as const } : {}),
    id: block.id,
    ...(leftParentId === undefined ? {} : { previousParentId: leftParentId }),
    version: block.version,
  };
};

/** Each touched block, flagged when the transaction moved it to another parent or changed who may read it. */
export const buildBlockNotices = (
  blocks: readonly NoticeSource[],
  before: ReadonlyMap<string, NoticeSource>,
): NotifiedBlock[] => blocks.map((block) => toNotice(block, before.get(block.id)));

/** Each touched view with the collection it belongs to. */
export const buildViewNotices = (
  versions: readonly BlockVersion[],
  stored: readonly { readonly id: string; readonly pageId: string }[],
): NotifiedView[] => {
  const pageIdByViewId = new Map(stored.map((view) => [view.id, view.pageId]));
  return versions.flatMap((version) => {
    const pageId = pageIdByViewId.get(version.id);
    return pageId === undefined ? [] : [{ ...version, pageId }];
  });
};

/**
 * The payload of the version notification. When the blocks do not fit in what Postgres allows, it carries no
 * blocks and says so, and the listener reads the versions itself.
 */
export const buildVersionNotification = (
  transactionId: string,
  spaceId: string,
  blocks: readonly NotifiedBlock[],
  views: readonly NotifiedView[] = [],
): string => {
  const full = JSON.stringify({ blocks, spaceId, transactionId, ...(views.length === 0 ? {} : { views }) });
  if (Buffer.byteLength(full) < BLOCK_NOTIFY_PAYLOAD_LIMIT_BYTES) return full;
  return JSON.stringify({ spaceId, transactionId, truncated: true });
};
