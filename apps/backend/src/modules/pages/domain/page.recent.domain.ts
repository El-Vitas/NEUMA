import type { RecentBlockEdit, RecentlyEditedPage } from './page.recent.domain.types';

/** Each page takes the time and the author of its newest edit among the edits given; the newest page comes first. */
export const foldRecentEdits = (edits: readonly RecentBlockEdit[]): RecentlyEditedPage[] => {
  const newestByPage = new Map<string, RecentBlockEdit>();
  for (const edit of edits) {
    const newest = newestByPage.get(edit.pageId);
    if (newest === undefined || edit.editedAt > newest.editedAt) newestByPage.set(edit.pageId, edit);
  }
  return [...newestByPage.values()]
    .toSorted((first, second) => second.editedAt.getTime() - first.editedAt.getTime())
    .map(({ editedAt, editedById, pageId }) => ({ editedAt, editedById, id: pageId }));
};
