import {
  LOCAL_CACHE_DISPOSABLE_STORES as CACHE_STORES,
  LOCAL_CACHE_DATABASE_SCHEMA_VERSION as DATABASE_SCHEMA_VERSION,
  LOCAL_CACHE_META_KEY as META_KEY,
  LOCAL_CACHE_STORE as STORE,
} from '../constants/local-cache.constants';
import type {
  CacheableBody,
  CachedRecord,
  CachedResult,
  CacheMeta,
  LocalStorageBundle,
  RejectedTransaction,
  StoredTransaction,
} from '../types/local-cache.types';

const waitForRequest = <Value>(request: IDBRequest<Value>): Promise<Value> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });

const waitForTransaction = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });

const createStores = (database: IDBDatabase): void => {
  database.createObjectStore(STORE.records, { keyPath: 'body.id' });
  database.createObjectStore(STORE.results, { keyPath: 'key' });
  database.createObjectStore(STORE.meta);
  database.createObjectStore(STORE.transactions, { keyPath: 'id' });
  database.createObjectStore(STORE.rejected, { keyPath: 'id' });
};

const openDatabase = (factory: IDBFactory, name: string): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = factory.open(name, DATABASE_SCHEMA_VERSION);
    request.onupgradeneeded = () => createStores(request.result);
    request.onsuccess = () => {
      const { result } = request;
      /** Whoever deletes the database (signing out, another person's login) is never kept waiting by this tab. */
      result.onversionchange = () => result.close();
      resolve(result);
    };
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened'));
    request.onblocked = () => reject(new Error('IndexedDB open was blocked'));
  });

/** Writes and deletes in one transaction, so a crash leaves either all of it or none. */
const writeAll = async (
  database: IDBDatabase,
  storeName: string,
  write: (store: IDBObjectStore) => void,
): Promise<void> => {
  const transaction = database.transaction(storeName, 'readwrite');
  const done = waitForTransaction(transaction);
  write(transaction.objectStore(storeName));
  await done;
};

const readAll = async <Value>(database: IDBDatabase, storeName: string): Promise<readonly Value[]> => {
  const transaction = database.transaction(storeName, 'readonly');
  return waitForRequest<Value[]>(transaction.objectStore(storeName).getAll());
};

const clearStores = async (database: IDBDatabase, storeNames: readonly string[]): Promise<void> => {
  const transaction = database.transaction([...storeNames], 'readwrite');
  const done = waitForTransaction(transaction);
  for (const name of storeNames) transaction.objectStore(name).clear();
  await done;
};

/** The cache on disk: one IndexedDB database. Throws when the browser refuses to open it; the caller falls back. */
export const openIndexedDbStorage = async <Body extends CacheableBody>(
  factory: IDBFactory,
  name: string,
): Promise<LocalStorageBundle<Body>> => {
  const database = await openDatabase(factory, name);
  const put = (storeName: string, values: readonly unknown[]): Promise<void> =>
    writeAll(database, storeName, (store) => {
      for (const value of values) store.put(value);
    });
  const remove = (storeName: string, keys: readonly string[]): Promise<void> =>
    writeAll(database, storeName, (store) => {
      for (const key of keys) store.delete(key);
    });

  return {
    cache: {
      clearCache: () => clearStores(database, CACHE_STORES),
      deleteRecords: (ids) => remove(STORE.records, ids),
      deleteResults: (keys) => remove(STORE.results, keys),
      destroy: () => clearStores(database, Object.values(STORE)),
      listRecords: () => readAll<CachedRecord<Body>>(database, STORE.records),
      listResults: () => readAll<CachedResult>(database, STORE.results),
      putRecords: (records) => put(STORE.records, records),
      putResult: (result) => put(STORE.results, [result]),
      readMeta: async () => {
        const transaction = database.transaction(STORE.meta, 'readonly');
        const meta = await waitForRequest<CacheMeta | undefined>(transaction.objectStore(STORE.meta).get(META_KEY));
        return meta ?? null;
      },
      writeMeta: (meta) =>
        writeAll(database, STORE.meta, (store) => {
          store.put(meta, META_KEY);
        }),
    },
    outbox: {
      appendTransaction: (transaction) => put(STORE.transactions, [transaction]),
      deleteRejected: (id) => remove(STORE.rejected, [id]),
      deleteTransaction: (id) => remove(STORE.transactions, [id]),
      listRejected: () => readAll<RejectedTransaction>(database, STORE.rejected),
      listTransactions: () => readAll<StoredTransaction>(database, STORE.transactions),
      putRejected: (transaction) => put(STORE.rejected, [transaction]),
      updateTransaction: (transaction) => put(STORE.transactions, [transaction]),
    },
  };
};

export const deleteIndexedDbDatabases = async (factory: IDBFactory, names: readonly string[]): Promise<void> => {
  await Promise.all(
    names.map(
      (name) =>
        new Promise<void>((resolve, reject) => {
          const request = factory.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be deleted'));
          request.onblocked = () => resolve();
        }),
    ),
  );
};
