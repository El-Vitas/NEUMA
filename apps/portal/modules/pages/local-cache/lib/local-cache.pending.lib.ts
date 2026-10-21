import { LOCAL_CACHE_DATABASE_PREFIX } from '../constants/local-cache.constants';
import { openIndexedDbStorage } from './local-cache.indexeddb.lib';

/** How many writes of this browser the server has not answered yet, whoever wrote them; zero without IndexedDB. */
export const countBrowserPendingTransactions = async (): Promise<number> => {
  if (typeof indexedDB === 'undefined') return 0;
  const databases = await indexedDB.databases();
  const names = databases.flatMap((database) =>
    database.name?.startsWith(LOCAL_CACHE_DATABASE_PREFIX) === true ? [database.name] : [],
  );
  const counts = await Promise.all(
    names.map(async (name) => {
      const { outbox } = await openIndexedDbStorage(indexedDB, name);
      return (await outbox.listTransactions()).length;
    }),
  );
  return counts.reduce((total, count) => total + count, 0);
};
