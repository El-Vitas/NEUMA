import type { Result, UserRole } from '@neuma/shared';
import type { BlockRows, VisibleBlock } from '../domain/block.domain.types';
import type {
  BlockAccessDeniedError,
  BlockSubtreeTooLargeError,
  BlockSyncTextTooLargeError,
  BlockTreeTooDeepError,
} from '../domain/block.error';

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
  /** The size of the Yjs state, which is read apart once the caps and the viewer's access are settled. */
  readonly textStateBytes: number;
  readonly type: string;
  readonly version: number;
}

/** A block row without the columns only the recursive reads add. */
export type StoredBlockRow = Omit<BlockRow, 'isDepthExceeded' | 'relation' | 'textStateBytes'>;

/** True when a chain of parents was longer than the depth limit, so the rows are incomplete. */
export interface BlockReadResult extends BlockRows {
  readonly isDepthExceeded: boolean;
  /** The size of the Yjs state of each target that has one, by block id. */
  readonly textStateBytes: ReadonlyMap<string, number>;
}

/** A visible block with its Yjs text state as base64, so the editor starts from the server's document. */
export interface SyncedBlock extends VisibleBlock {
  readonly textState: string | null;
}

export interface BlockSyncResponse {
  readonly blocks: readonly SyncedBlock[];
  /** Catch-up reads only: requested ids that no longer exist or are no longer readable. */
  readonly revoked?: readonly string[];
}

export type BlockSyncResult = Result<
  BlockSyncResponse,
  BlockAccessDeniedError | BlockSubtreeTooLargeError | BlockSyncTextTooLargeError | BlockTreeTooDeepError
>;

export interface BlockRepositoryContract {
  findReadableSpaceIds(spaceIds: readonly string[], reader: BlockReader): Promise<ReadonlySet<string>>;
  /** The same answer for many readers from two statements, whatever their number: the key is the user id. */
  findReadableSpaceIdsByReader(
    spaceIds: readonly string[],
    readers: readonly BlockReader[],
  ): Promise<ReadonlyMap<string, ReadonlySet<string>>>;
  readChanged(requested: readonly RequestedBlock[]): Promise<BlockReadResult>;
  readSubtree(pageId: string): Promise<BlockReadResult>;
  /** The Yjs state of each of these blocks that has one. */
  readTextStates(blockIds: readonly string[]): Promise<ReadonlyMap<string, Uint8Array>>;
}
