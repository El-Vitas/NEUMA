import { SPACE_PRIVATE_SLUG_PREFIX } from '../constants/spaces.constants';

export const buildPrivateSpaceSlug = (userId: string): string => `${SPACE_PRIVATE_SLUG_PREFIX}${userId}`;
