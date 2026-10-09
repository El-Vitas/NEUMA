import { SPACE_PRIVATE_SLUG_PREFIX } from '../constants/spaces.constants';

export const buildPrivateSpaceSlug = (userId: string): string => `${SPACE_PRIVATE_SLUG_PREFIX}${userId}`;

/** Rejects the reserved private prefix, which would otherwise silently block the owner's private space. */
export const isSpaceSlugAvailableToAsk = (slug: string): boolean =>
  !slug.toLowerCase().startsWith(SPACE_PRIVATE_SLUG_PREFIX);
