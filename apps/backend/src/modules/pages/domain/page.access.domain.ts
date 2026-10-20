import { PageLifecycle } from '@neuma/db';
import { type BlockViewer, canReadBlock, resolveBlockRole } from '@neuma/shared';
import type { PageAccessProfile, PageAncestryLink } from './page.access.domain.types';

/** The same role the block pipeline computes for a write: the nearest block that declares permissions decides. */
export const describePageAccess = (
  chain: readonly PageAncestryLink[],
  viewer: BlockViewer,
  canReadSpace: boolean,
): PageAccessProfile => ({
  declared: chain.find((link) => link.permissions !== null)?.permissions ?? null,
  isInTrash: chain.some((link) => link.lifecycle === PageLifecycle.TRASHED),
  role: resolveBlockRole({
    canReadSpace,
    chain: chain.map((link) => ({ id: link.id, permissions: link.permissions })),
    viewer,
  }),
});

export const canReadPage = (profile: PageAccessProfile): boolean => canReadBlock(profile.role);
