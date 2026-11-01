import type { RejectedTransaction } from '../types/local-cache.types';

/** What the person wrote in a change the server refused, to show it and to copy it. */
export const readRejectedText = (item: RejectedTransaction): string =>
  item.previews.map((preview) => preview.text).join('\n\n');

export const filterRejectedOfPage = (
  list: readonly RejectedTransaction[],
  pageId: string,
): readonly RejectedTransaction[] =>
  list.filter((item) => item.pageId === pageId).toSorted((left, right) => left.rejectedAt - right.rejectedAt);
