import type { Result, UserRole } from '@neuma/shared';
import type { BlockRows, VisibleBlock } from '../domain/block.domain.types';
import type { BlockAccessDeniedError, BlockSubtreeTooLargeError, BlockTreeTooDeepError } from '../domain/block.error';

export interface RequestedBlock {
  readonly id: string;
  readonly version: number;
}

export type BlockSyncRequest =
  | { readonly blocks: readonly RequestedBlock[]; readonly kind: 'changed' }
  | { readonly kind: 'page'; readonly pageId: string };

export interface BlockReader {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

/** A row as the statements return it: JSON, enum and relation columns still to be narrowed. */
export interface BlockRow {
  readonly alive: boolean;
  readonly children: unknown;
  readonly createdAt: Date;
  readonly createdById: string;
  readonly editedAt: Date;
  readonly editedById: string;
  readonly format: unknown;
  readonly id: string;
  readonly isDepthExceeded: boolean;
  readonly lifecycle: string;
  readonly lockedAt: Date | null;
  readonly parentId: string | null;
  readonly permissions: unknown;
  readonly properties: unknown;
  readonly relation: string;
  readonly spaceId: string;
  readonly text: string;
  readonly type: string;
  readonly version: number;
}

/** True when a chain of parents was longer than the depth limit, so the rows are incomplete. */
export interface BlockReadResult extends BlockRows {
  readonly isDepthExceeded: boolean;
}

export interface BlockSyncResponse {
  readonly blocks: readonly VisibleBlock[];
  /** Catch-up reads only: requested ids that no longer exist or are no longer readable. */
  readonly revoked?: readonly string[];
}

export type BlockSyncResult = Result<
  BlockSyncResponse,
  BlockAccessDeniedError | BlockSubtreeTooLargeError | BlockTreeTooDeepError
>;

export interface BlockRepositoryContract {
  findReadableSpaceIds(spaceIds: readonly string[], reader: BlockReader): Promise<ReadonlySet<string>>;
  readChanged(requested: readonly RequestedBlock[]): Promise<BlockReadResult>;
  readSubtree(pageId: string): Promise<BlockReadResult>;
}
