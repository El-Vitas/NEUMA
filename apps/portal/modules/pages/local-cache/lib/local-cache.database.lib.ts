import { LOCAL_CACHE_DATABASE_PREFIX } from '../constants/local-cache.constants';

export const buildDatabaseName = (userId: string): string => `${LOCAL_CACHE_DATABASE_PREFIX}${userId}`;

/** The cache databases that are not this user's: a shared browser must never keep another person's copy. */
export const listForeignDatabaseNames = (names: readonly string[], currentName: string): readonly string[] =>
  names.filter((name) => name.startsWith(LOCAL_CACHE_DATABASE_PREFIX) && name !== currentName);
