import type { PageLifecycle } from '@neuma/db';
import type { BlockPermissions, BlockRole } from '@neuma/shared';

/** One page of the chain that runs from a page up to the top of its tree, the page itself first. */
export interface PageAncestryLink {
  readonly id: string;
  readonly lifecycle: PageLifecycle;
  readonly permissions: BlockPermissions;
}

export interface PageAccessProfile {
  /** The permissions the page declares, or the nearest page above it that does: what its blocks answer by. */
  readonly declared: BlockPermissions;
  /** The page or one of its ancestors is in the trash, so the page is out of sight whatever it says itself. */
  readonly isInTrash: boolean;
  readonly role: BlockRole;
}
