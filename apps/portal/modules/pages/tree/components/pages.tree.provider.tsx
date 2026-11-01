'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { PAGES_TREE_STORE_CONTEXT } from '../constants/pages.tree.context.constants';
import { readTreeWindowsFromServer } from '../lib/pages.tree.client.lib';
import { buildPageTreeRootsSignature } from '../lib/pages.tree.lib';
import { createSeededPageTreeStore } from '../lib/pages.tree.store.lib';
import type { PageTreeSpaceRoots } from '../types/pages.tree.types';

interface IProps {
  readonly children: ReactNode;
  readonly spaces: readonly PageTreeSpaceRoots[];
}

/**
 * Keeps the part of the page tree the sidebar has open (ADR 030). The server draws the top of each space and the store
 * takes it as its first state. When the server draws different pages at the top, the branches that are open are read
 * again too; what changes below arrives through the live channel. Drawing the same pages again changes nothing.
 */
export const PagesTreeProvider = ({ children, spaces }: IProps) => {
  const [store] = useState(() => createSeededPageTreeStore(readTreeWindowsFromServer, spaces));
  const signature = buildPageTreeRootsSignature(spaces);
  const lastSignatureRef = useRef(signature);

  useEffect(() => {
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;
    for (const space of spaces) {
      store.seedRoots(space.id, space.roots);
      void store.reloadSpace(space.id);
    }
  }, [signature, spaces, store]);

  return <PAGES_TREE_STORE_CONTEXT value={store}>{children}</PAGES_TREE_STORE_CONTEXT>;
};
