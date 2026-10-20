import type { BlockPermissions, UserRole } from '@neuma/shared';

export interface BlockAccessViewer {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

/** One block of a candidate's chain, from the candidate itself (first) up to its root. */
export interface BlockAccessChainRow {
  readonly alive: boolean;
  readonly candidateId: string;
  readonly id: string;
  readonly lifecycle: string;
  readonly permissions: BlockPermissions;
  readonly spaceId: string;
}

export interface ReadableBlocksInput {
  readonly readableSpaceIds: ReadonlySet<string>;
  readonly rows: readonly BlockAccessChainRow[];
  readonly viewer: BlockAccessViewer;
}

export interface ReadablePage {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}
