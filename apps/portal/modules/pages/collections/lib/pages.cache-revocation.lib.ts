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

const isRelatedRowList = (value: unknown): value is readonly { readonly id: string }[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null && 'id' in item);

/** The titles of related rows are kept with the layout; the ones of rows the reader lost must not outlive them. */
const removeRelatedRowsFromLayout = (layout: string, revoked: ReadonlySet<string>): string => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(layout);
  } catch {
    return layout;
  }
  if (typeof parsed !== 'object' || parsed === null || !('lookups' in parsed)) return layout;
  const { lookups } = parsed;
  if (typeof lookups !== 'object' || lookups === null || !('relatedRows' in lookups)) return layout;
  const related = lookups.relatedRows;
  if (!isRelatedRowList(related) || !related.some((row) => revoked.has(row.id))) return layout;
  return JSON.stringify({
    ...parsed,
    lookups: { ...lookups, relatedRows: related.filter((row) => !revoked.has(row.id)) },
  });
};

/**
 * A fresh read of a view no longer cites some rows the cache held for it: they left the view, or the reader lost them.
 * The server says which of them the reader may no longer open, and those are forgotten at once (ADR 029). When it
 * cannot be asked nothing is known, so nothing is forgotten here and the next read asks again.
 */
export const forgetRevokedRows = async ({ cache, droppedIds, readRevoked }: CacheRevocationInput): Promise<void> => {
  const held = listHeld(cache, droppedIds);
  for (const batch of chunk(held, PAGE_REVOCATION_CHECK_BATCH_ROWS)) {
    const revoked = await readRevoked(batch);
    if (revoked === null || revoked.length === 0) continue;
    await cache.purgeRecords(revoked);
    await cache.rewriteLayouts((layout) => removeRelatedRowsFromLayout(layout, new Set(revoked)));
  }
};
