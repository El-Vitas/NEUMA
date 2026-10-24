import { browserLogger as logger } from '../../lib/pages.browser-logger.lib';
import { LOCAL_CACHE_DATABASE_PREFIX } from '../constants/local-cache.constants';
import type { BrowserLocalCache, CacheableBody, LocalStorageBundle } from '../types/local-cache.types';
import { buildDatabaseName, listForeignDatabaseNames } from './local-cache.database.lib';
import { computeCacheBudgetBytes } from './local-cache.eviction.lib';
import { deleteIndexedDbDatabases, openIndexedDbStorage } from './local-cache.indexeddb.lib';
import { createMemoryStorage } from './local-cache.memory-storage.lib';
import { createOutbox } from './local-cache.outbox.lib';
import { openLocalCache } from './local-cache.store.lib';

const readQuotaBytes = async (): Promise<null | number> => {
  try {
    const estimate = await navigator.storage.estimate();
    return estimate.quota ?? null;
  } catch {
    return null;
  }
};

const listDatabaseNames = async (factory: IDBFactory): Promise<readonly string[]> => {
  const databases = await factory.databases();
  return databases.flatMap((database) => (database.name === undefined ? [] : [database.name]));
};

const openStorage = async <Body extends CacheableBody>(
  factory: IDBFactory | undefined,
  name: string,
): Promise<{ readonly isPersistent: boolean; readonly storage: LocalStorageBundle<Body> }> => {
  if (factory === undefined) return { isPersistent: false, storage: createMemoryStorage<Body>() };
  try {
    await deleteIndexedDbDatabases(factory, listForeignDatabaseNames(await listDatabaseNames(factory), name));
    return { isPersistent: true, storage: await openIndexedDbStorage<Body>(factory, name) };
  } catch (error) {
    logger.error({ err: error }, 'The local cache could not be opened; it stays in memory');
    return { isPersistent: false, storage: createMemoryStorage<Body>() };
  }
};

/**
 * Opens the cache of this person in this browser. Anyone else's cache is deleted first, so a shared browser never
 * shows one person what another read. Without IndexedDB it works from memory and says so.
 */
export const openBrowserLocalCache = async <Body extends CacheableBody>(
  userId: string,
): Promise<BrowserLocalCache<Body>> => {
  const factory = typeof indexedDB === 'undefined' ? undefined : indexedDB;
  const { isPersistent, storage } = await openStorage<Body>(factory, buildDatabaseName(userId));
  const budgetBytes = computeCacheBudgetBytes(await readQuotaBytes());
  const cache = await openLocalCache({ budgetBytes, now: Date.now, storage: storage.cache, userId });
  return { cache, isPersistent, outbox: createOutbox({ now: Date.now, storage: storage.outbox }) };
};

/** Deletes every cache database of this browser; the last thing signing out does. */
export const wipeBrowserLocalCaches = async (): Promise<void> => {
  if (typeof indexedDB === 'undefined') return;
  try {
    const names = (await listDatabaseNames(indexedDB)).filter((name) => name.startsWith(LOCAL_CACHE_DATABASE_PREFIX));
    await deleteIndexedDbDatabases(indexedDB, names);
  } catch (error) {
    logger.error({ err: error }, 'The local cache could not be deleted on sign out');
  }
};
