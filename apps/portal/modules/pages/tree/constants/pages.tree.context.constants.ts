import { createContext } from 'react';
import type { PageTreeStore } from '../types/pages.tree.types';

/** Without a provider there is no sidebar to keep, so a hook that needs the tree says so. */
export const PAGES_TREE_STORE_CONTEXT = createContext<PageTreeStore | null>(null);
