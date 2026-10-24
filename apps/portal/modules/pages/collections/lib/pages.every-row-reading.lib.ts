import { PAGE_VIEW_CLIENT_MODE_MAXIMUM_PAGES } from '../constants/pages.query.constants';
import type { EveryRowRead, PageEveryRowRead } from '../types/pages.query.types';

const mergeById = <Item extends { readonly id: string }>(lists: readonly (readonly Item[])[]): readonly Item[] => [
  ...new Map(lists.flat().map((item) => [item.id, item])).values(),
];

/**
 * Every row of the collection, page after page. Null when a page cannot be read or the collection is larger than a
 * browser takes: part of the rows passed off as all of them would make a filter or a count lie. The cursor of changes
 * is the one taken before the first rows, so a change made while the rest was read is applied again, not lost.
 */
export const readEveryRow = async (
  readPage: (cursor: string | undefined) => Promise<PageEveryRowRead | null>,
): Promise<EveryRowRead | null> => {
  const pages: PageEveryRowRead[] = [];
  let cursor: string | undefined;
  for (let count = 0; count < PAGE_VIEW_CLIENT_MODE_MAXIMUM_PAGES; count += 1) {
    const page = await readPage(cursor);
    if (page === null) return null;
    pages.push(page);
    if (page.nextCursor === null) {
      return {
        attachedFiles: mergeById(pages.map((read) => read.attachedFiles)),
        changesCursor: pages[0]?.changesCursor ?? page.changesCursor,
        relatedRows: mergeById(pages.map((read) => read.relatedRows)),
        rows: mergeById(pages.map((read) => read.rows)),
      };
    }
    cursor = page.nextCursor;
  }
  return null;
};
