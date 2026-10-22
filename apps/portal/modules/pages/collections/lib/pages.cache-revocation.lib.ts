import { PAGE_REVOCATION_CHECK_BATCH_ROWS } from '../constants/pages.view-cache.constants';
import type { CacheRevocationInput, HeldRowVersion, RevocableCache } from '../types/pages.view-cache.types';

const chunk = <Item>(items: readonly Item[], size: number): readonly (readonly Item[])[] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_unused, index) =>
    items.slice(index * size, (index + 1) * size),
  );

const listHeld = (cache: RevocableCache, ids: readonly string[]): readonly HeldRowVersion[] =>
  ids.flatMap((id) => {
    const body = cache.readRecord(id);
    return body === null ? [] : [{ id, version: body.version }];
  });

/**
 * A fresh read of a view no longer cites some rows the cache held for it: they left the view, or the reader lost them.
 * The server says which of them the reader may no longer open, and those are forgotten at once (ADR 029). When it
 * cannot be asked nothing is known, so nothing is forgotten here and the next read asks again.
 */
export const forgetRevokedRows = async ({ cache, droppedIds, readRevoked }: CacheRevocationInput): Promise<void> => {
  const held = listHeld(cache, droppedIds);
  for (const batch of chunk(held, PAGE_REVOCATION_CHECK_BATCH_ROWS)) {
    const revoked = await readRevoked(batch);
    if (revoked !== null && revoked.length > 0) await cache.purgeRecords(revoked);
  }
};
