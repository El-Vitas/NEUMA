import type { CollectedRows, CollectRowPagesInput } from '../types/pages.rows-collecting.types';
import type { PageRow } from '../types/pages.schema.types';

/**
 * Reads pages one after another until the rows wanted are in hand or the server has no more. A page that cannot be
 * read makes the whole answer null: half of the rows passed off as all of them is worse than an error.
 */
export const collectRowPages = async ({
  readPage,
  startCursor,
  wanted,
}: CollectRowPagesInput): Promise<CollectedRows | null> => {
  const collected: PageRow[] = [];
  const seen = new Set<string>();
  let cursor = startCursor;
  do {
    const page = await readPage(cursor, wanted - collected.length);
    if (page === null) return null;
    for (const row of page.rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      collected.push(row);
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined && collected.length < wanted);
  return { nextCursor: cursor ?? null, rows: collected };
};
