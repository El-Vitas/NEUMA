import { PAGE_VERSION_GROUPING_WINDOW_MS } from './page.version.constants';

/**
 * Live editing saves every few seconds; one version per save would bury the history. Saves by the same person
 * within a few minutes of the version they started fold into it, so the history keeps one entry per stretch.
 */
export const isSameEditingStretch = (
  latest: { readonly createdAt: Date; readonly createdById: string },
  authorId: string,
  now: Date,
): boolean =>
  latest.createdById === authorId && now.getTime() - latest.createdAt.getTime() < PAGE_VERSION_GROUPING_WINDOW_MS;
