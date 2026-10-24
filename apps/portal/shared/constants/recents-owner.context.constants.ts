import { createContext } from 'react';

/** Who the recent pages belong to; null outside the signed-in portal, where nothing is kept. */
export const RECENTS_OWNER_CONTEXT = createContext<string | null>(null);
