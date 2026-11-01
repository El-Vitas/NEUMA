import type { BlockPermissions, BlockRole, UserRole } from '@neuma/shared';
import type { DeclaringAncestor } from '../domain/block-access.domain.types';

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

/** What one viewer holds on one block, and the block whose declaration decides it. */
export interface BlockStanding {
  readonly declaring: DeclaringAncestor;
  /** The nearest declaring block strictly above this one: what it follows once it stops declaring its own. */
  readonly inheritedDeclaring: DeclaringAncestor;
  readonly role: BlockRole;
  readonly spaceId: string;
}

export interface ReadablePage {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}
