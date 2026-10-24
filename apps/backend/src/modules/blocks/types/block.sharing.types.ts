import type { Result } from '@neuma/shared';
import type { BlockAccessDeniedError } from '../domain/block.error';
import type { BlockAccessEntry, BlockAccessMember } from '../domain/block.sharing.domain.types';
import type { BlockPermissionsForbiddenError } from '../domain/block.transaction.error';

/** The block whose declaration decides who has access, as the dialog names it. */
export interface BlockAccessSource {
  readonly id: string;
  readonly title: string;
  readonly type: string;
}

/** What a block follows when it declares nothing of its own: the nearest declaration above it, or the space. */
export interface BlockAccessInheritance {
  readonly entries: readonly BlockAccessEntry[];
  readonly source: BlockAccessSource | null;
}

export interface BlockAccessView {
  readonly blockId: string;
  readonly entries: readonly BlockAccessEntry[];
  readonly inherited: BlockAccessInheritance;
  /** False when the block follows the declaration of `source`, or the space when there is none. */
  readonly isDeclaredHere: boolean;
  readonly members: readonly BlockAccessMember[];
  readonly source: BlockAccessSource | null;
  readonly spaceId: string;
  /** Who is asking, so the dialog can warn before a change takes away their own access. */
  readonly viewerId: string;
}

export type BlockAccessResult = Result<BlockAccessView, BlockAccessDeniedError | BlockPermissionsForbiddenError>;
