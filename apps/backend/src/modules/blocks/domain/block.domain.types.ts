import type { BlockPermissions, BlockRole, BlockViewer, PageLifecycle } from '@neuma/shared';

/** A stored block without its binary text state, which the sync endpoint never sends. */
export interface BlockRecord {
  readonly alive: boolean;
  readonly children: readonly string[];
  readonly createdAt: Date;
  readonly createdById: string;
  readonly editedAt: Date;
  readonly editedById: string;
  readonly format: Record<string, unknown> | null;
  readonly id: string;
  readonly lifecycle: PageLifecycle;
  readonly lockedAt: Date | null;
  readonly parentId: string | null;
  readonly permissions: BlockPermissions;
  readonly properties: Record<string, unknown>;
  readonly spaceId: string;
  readonly text: string;
  readonly type: string;
  readonly version: number;
}

/** `targets` are the blocks asked for; `context` is what their roles and children lists depend on. */
export interface BlockRows {
  readonly context: readonly BlockRecord[];
  readonly targets: readonly BlockRecord[];
}

export interface VisibleBlock extends Omit<BlockRecord, 'permissions'> {
  /** Present only when the viewer can manage the block's permissions. */
  readonly permissions?: BlockPermissions;
  readonly role: BlockRole;
}

export type RecordsById = ReadonlyMap<string, BlockRecord>;

export interface VisibleBlocksInput {
  readonly readableSpaceIds: ReadonlySet<string>;
  readonly rows: BlockRows;
  readonly viewer: BlockViewer;
}
