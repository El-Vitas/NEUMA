import { type BlockViewer, canReadBlock, PAGE_LIFECYCLE } from '@neuma/shared';
import { findDeclaringInChain, resolveRoleFromDeclaring } from '../../../common/domain/block-access.domain';
import type { PageAccessProfile, PageAncestryLink } from './page.access.domain.types';

/** The same role the block pipeline computes for a write: the nearest block that declares permissions decides. */
export const describePageAccess = (
  chain: readonly PageAncestryLink[],
  viewer: BlockViewer,
  canReadSpace: boolean,
): PageAccessProfile => {
  const declaring = findDeclaringInChain(chain);
  return {
    declared: declaring?.permissions ?? null,
    isInTrash: chain.some((link) => link.lifecycle === PAGE_LIFECYCLE.TRASHED),
    role: resolveRoleFromDeclaring(declaring, canReadSpace, viewer),
  };
};

export const canReadPage = (profile: PageAccessProfile): boolean => canReadBlock(profile.role);
