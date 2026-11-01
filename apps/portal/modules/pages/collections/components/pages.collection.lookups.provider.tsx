'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  PAGE_COLLECTION_LOOKUPS_CONTEXT,
  PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT,
} from '../constants/pages.lookups.context.constants';
import { mergeCollectionLookups } from '../lib/pages.lookups.lib';
import type { PageCollectionLookups, PageCollectionLookupsUpdate } from '../types/pages.lookups.types';

interface IProps {
  readonly children: ReactNode;
  readonly lookups: PageCollectionLookups;
}

/** Starts from what the server resolved and grows as later pages of rows bring the names their cells need. */
export const PagesCollectionLookupsProvider = ({ children, lookups }: IProps) => {
  const [read, setRead] = useState(lookups);
  const [held, setHeld] = useState(lookups);
  if (read !== lookups) {
    setRead(lookups);
    setHeld(lookups);
  }
  const add = (update: PageCollectionLookupsUpdate): void =>
    setHeld((current) => mergeCollectionLookups(current, update));

  return (
    <PAGE_COLLECTION_LOOKUPS_CONTEXT value={held}>
      <PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT value={add}>{children}</PAGE_COLLECTION_LOOKUPS_UPDATER_CONTEXT>
    </PAGE_COLLECTION_LOOKUPS_CONTEXT>
  );
};
