import type { UserRole } from '@company-brain/shared';
import { USER_ROLE } from '@company-brain/shared';

export const USERS_CACHE_TAG = 'users';

export const USERS_DEFAULT_PAGE = 1;
export const USERS_DEFAULT_PAGE_SIZE = 20;
export const USERS_MAX_PAGE_SIZE = 100;

export const USER_NAME_MIN_LENGTH = 2;
export const USER_NAME_MAX_LENGTH = 100;

export const USERS_SEARCH_PARAM = 'search';
export const USERS_SEARCH_COLUMN_ID = 'name';

export const USER_ROLE_BADGE_VARIANTS = {
  [USER_ROLE.ADMIN]: 'default',
  [USER_ROLE.WORKER]: 'info',
  [USER_ROLE.CLIENT]: 'outline',
} as const satisfies Record<UserRole, 'default' | 'info' | 'outline'>;

export const USERS_DIALOG_INPUT_CLASS = 'h-9 bg-background';
