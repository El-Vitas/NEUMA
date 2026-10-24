import type {
  CacheableBody,
  CachedRecord,
  CachedResult,
  CacheMeta,
  LocalStorageBundle,
  RejectedTransaction,
  StoredTransaction,
} from '../types/local-cache.types';

/** Holds everything in memory: the cache of a browser without IndexedDB, and the disk of the tests. */
export const createMemoryStorage = <Body extends CacheableBody>(): LocalStorageBundle<Body> => {
  const records = new Map<string, CachedRecord<Body>>();
  const results = new Map<string, CachedResult>();
  const transactions = new Map<string, StoredTransaction>();
  const rejected = new Map<string, RejectedTransaction>();
  let meta: CacheMeta | null = null;

  const clearCache = (): Promise<void> => {
    records.clear();
    results.clear();
    return Promise.resolve();
  };

  const storeTransaction = (transaction: StoredTransaction): Promise<void> => {
    transactions.set(transaction.id, transaction);
    return Promise.resolve();
  };

  return {
    cache: {
      clearCache,
      deleteRecords: (ids) => {
        for (const id of ids) records.delete(id);
        return Promise.resolve();
      },
      deleteResults: (keys) => {
        for (const key of keys) results.delete(key);
        return Promise.resolve();
      },
      destroy: async () => {
        await clearCache();
        transactions.clear();
        rejected.clear();
        meta = null;
      },
      listRecords: () => Promise.resolve([...records.values()]),
      listResults: () => Promise.resolve([...results.values()]),
      putRecords: (incoming) => {
        for (const record of incoming) records.set(record.body.id, record);
        return Promise.resolve();
      },
      putResult: (result) => {
        results.set(result.key, result);
        return Promise.resolve();
      },
      readMeta: () => Promise.resolve(meta),
      writeMeta: (next) => {
        meta = next;
        return Promise.resolve();
      },
    },
    outbox: {
      appendTransaction: storeTransaction,
      deleteRejected: (id) => {
        rejected.delete(id);
        return Promise.resolve();
      },
      deleteTransaction: (id) => {
        transactions.delete(id);
        return Promise.resolve();
      },
      listRejected: () => Promise.resolve([...rejected.values()]),
      listTransactions: () => Promise.resolve([...transactions.values()]),
      putRejected: (transaction) => {
        rejected.set(transaction.id, transaction);
        return Promise.resolve();
      },
      rejectTransaction: (transaction) => {
        rejected.set(transaction.id, transaction);
        transactions.delete(transaction.id);
        return Promise.resolve();
      },
      restoreTransaction: (transaction) => {
        transactions.set(transaction.id, transaction);
        rejected.delete(transaction.id);
        return Promise.resolve();
      },
      updateTransaction: storeTransaction,
    },
  };
};
