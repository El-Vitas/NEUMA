'use client';

import { usePagesTreeStore } from '../hooks/use.pages.tree';
import { usePagesTreeLive } from '../hooks/use.pages.tree.live';

interface IProps {
  readonly spaceIds: readonly string[];
  /** Where the database was when each space's top was read for this render. */
  readonly watermarks: Readonly<Record<string, string>>;
}

/** Keeps the sidebar current with what other people do to the pages: create, move, rename, trash. */
export const PagesTreeLive = ({ spaceIds, watermarks }: IProps) => {
  usePagesTreeLive(usePagesTreeStore(), spaceIds, watermarks);
  return null;
};
