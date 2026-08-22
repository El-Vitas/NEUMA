import { SPACE_PRIVATE_SLUG_PREFIX } from '../constants/spaces.constants';

export const buildPrivateSpaceSlug = (userId: string): string => `${SPACE_PRIVATE_SLUG_PREFIX}${userId}`;

/**
 * Whether a name is one somebody may ask for when making a space.
 *
 * The private area of each person is made without reading first, trusting the
 * unique name to settle who gets it. That makes the name a thing worth taking:
 * whoever registers it first leaves its owner with no area at all, and the
 * silence is the whole problem — nothing fails, the area simply never appears.
 */
export const isSpaceSlugAvailableToAsk = (slug: string): boolean =>
  !slug.toLowerCase().startsWith(SPACE_PRIVATE_SLUG_PREFIX);
