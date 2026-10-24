import {
  LOCAL_CACHE_RECORD_EVICTION_PREFIX,
  LOCAL_CACHE_VALIDATION_MAXIMUM_AGE_MS,
  LOCAL_CACHE_VERSION,
} from '../constants/local-cache.constants';
import type {
  CacheableBody,
  CachedRecord,
  CachedResult,
  CacheEntryUsage,
  CacheMeta,
  LocalCache,
  LocalCacheOptions,
  LocalCacheStorage,
} from '../types/local-cache.types';
import { planEviction } from './local-cache.eviction.lib';

const estimateBytes = (value: unknown): number => JSON.stringify(value).length * 2;

/** True when the incoming record should replace the held one: newer, or the same version under another role. */
const isNewerRecord = (held: CacheableBody | undefined, incoming: CacheableBody): boolean =>
  held === undefined ||
  incoming.version > held.version ||
  (incoming.version === held.version && incoming.role !== held.role);

const readExpectedMeta = <Body extends CacheableBody>(options: LocalCacheOptions<Body>): CacheMeta => ({
  cacheVersion: LOCAL_CACHE_VERSION,
  userId: options.userId,
});

const prepareStorage = async <Body extends CacheableBody>(options: LocalCacheOptions<Body>): Promise<void> => {
  const held = await options.storage.readMeta();
  const isOtherOwner = held !== null && held.userId !== options.userId;
  if (isOtherOwner) await options.storage.destroy();
  else if (held !== null && held.cacheVersion !== LOCAL_CACHE_VERSION) await options.storage.clearCache();
  await options.storage.writeMeta(readExpectedMeta(options));
};

const dropStaleResults = async <Body extends CacheableBody>(
  storage: LocalCacheStorage<Body>,
  now: number,
): Promise<readonly CachedResult[]> => {
  const all = await storage.listResults();
  const isFresh = (result: CachedResult): boolean => now - result.validatedAt <= LOCAL_CACHE_VALIDATION_MAXIMUM_AGE_MS;
  const stale = all.filter((result) => !isFresh(result));
  if (stale.length > 0) await storage.deleteResults(stale.map((result) => result.key));
  return all.filter(isFresh);
};

/**
 * The browser's copy of what it has read: records by id and version, and the ids each query answered. Reads are
 * from memory; every write also goes to the storage. Opening it as another user empties it first (ADR 029).
 */
export const openLocalCache = async <Body extends CacheableBody>(
  options: LocalCacheOptions<Body>,
): Promise<LocalCache<Body>> => {
  const { budgetBytes, now, storage } = options;
  await prepareStorage(options);
  const records = new Map<string, CachedRecord<Body>>();
  const results = new Map<string, CachedResult>();
  for (const record of await storage.listRecords()) records.set(record.body.id, record);
  for (const result of await dropStaleResults(storage, now())) results.set(result.key, result);

  const listCitingResults = (id: string): readonly CachedResult[] =>
    [...results.values()].filter((result) => result.ids.includes(id));

  const purgeRecords = async (ids: readonly string[]): Promise<void> => {
    const idSet = new Set(ids);
    const citing = [...results.values()].filter((result) => result.ids.some((id) => idSet.has(id)));
    for (const id of ids) records.delete(id);
    for (const result of citing) results.delete(result.key);
    await storage.deleteRecords(ids);
    await storage.deleteResults(citing.map((result) => result.key));
  };

  const saveRecords: LocalCache<Body>['saveRecords'] = async (bodies) => {
    const readAt = now();
    const accepted = bodies
      .filter((body) => isNewerRecord(records.get(body.id)?.body, body))
      .map((body): CachedRecord<Body> => ({ body, bytes: estimateBytes(body), readAt }));
    for (const record of accepted) records.set(record.body.id, record);
    await storage.putRecords(accepted);
  };

  const saveResult: LocalCache<Body>['saveResult'] = async (input) => {
    const at = now();
    const result: CachedResult = {
      ...input,
      bytes: estimateBytes(input.ids) + input.layout.length * 2,
      lastAccessAt: at,
      savedAt: at,
      validatedAt: at,
    };
    results.set(result.key, result);
    await storage.putResult(result);
  };

  const readResult: LocalCache<Body>['readResult'] = (key) => {
    const result = results.get(key);
    if (result === undefined) return null;
    const held = result.ids.map((id) => records.get(id)?.body);
    if (held.some((body) => body === undefined)) return null;
    return { records: held.filter((body): body is Body => body !== undefined), result };
  };

  const rewriteLayouts: LocalCache<Body>['rewriteLayouts'] = async (rewrite) => {
    for (const result of [...results.values()]) {
      const layout = rewrite(result.layout);
      if (layout === result.layout) continue;
      const next: CachedResult = { ...result, bytes: estimateBytes(result.ids) + layout.length * 2, layout };
      results.set(next.key, next);
      await storage.putResult(next);
    }
  };

  const validateResult: LocalCache<Body>['validateResult'] = async (key, changesCursor) => {
    const result = results.get(key);
    if (result === undefined) return;
    const at = now();
    const next: CachedResult = { ...result, changesCursor, lastAccessAt: at, validatedAt: at };
    results.set(key, next);
    await storage.putResult(next);
  };

  const listUsage = (): readonly CacheEntryUsage[] => {
    const cited = new Set([...results.values()].flatMap((result) => result.ids));
    const fromResults = [...results.values()].map((result) => ({
      bytes:
        result.bytes +
        result.ids
          .filter((id) => listCitingResults(id).length === 1)
          .reduce((total, id) => total + (records.get(id)?.bytes ?? 0), 0),
      key: result.key,
      lastAccessAt: result.lastAccessAt,
    }));
    const orphans = [...records.values()]
      .filter((record) => !cited.has(record.body.id))
      .map((record) => ({
        bytes: record.bytes,
        key: `${LOCAL_CACHE_RECORD_EVICTION_PREFIX}${record.body.id}`,
        lastAccessAt: record.readAt,
      }));
    return [...fromResults, ...orphans];
  };

  const evictKey = async (key: string): Promise<void> => {
    if (key.startsWith(LOCAL_CACHE_RECORD_EVICTION_PREFIX)) {
      const id = key.slice(LOCAL_CACHE_RECORD_EVICTION_PREFIX.length);
      records.delete(id);
      await storage.deleteRecords([id]);
      return;
    }
    const result = results.get(key);
    if (result === undefined) return;
    results.delete(key);
    const exclusive = result.ids.filter((id) => listCitingResults(id).length === 0);
    for (const id of exclusive) records.delete(id);
    await storage.deleteResults([key]);
    await storage.deleteRecords(exclusive);
  };

  const enforceBudget: LocalCache<Body>['enforceBudget'] = async (protectedKeys = new Set()) => {
    const evicted = planEviction(listUsage(), budgetBytes, protectedKeys);
    for (const key of evicted) await evictKey(key);
    return evicted;
  };

  const purgeSpace: LocalCache<Body>['purgeSpace'] = async (spaceId) => {
    const ids = [...records.values()]
      .filter((record) => record.body.spaceId === spaceId)
      .map((record) => record.body.id);
    await purgeRecords(ids);
  };

  return {
    enforceBudget,
    listRecords: () => [...records.values()].map((record) => record.body),
    purgeRecords,
    purgeSpace,
    readRecord: (id) => records.get(id)?.body ?? null,
    readResult,
    rewriteLayouts,
    saveRecords,
    saveResult,
    validateResult,
    wipe: async () => {
      records.clear();
      results.clear();
      await storage.destroy();
    },
  };
};
