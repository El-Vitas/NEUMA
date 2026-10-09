'use client';

import { useSyncExternalStore } from 'react';
import { findThemeRoot } from '@/shared/lib/theme.lib';

/** The element never changes while the page lives, so there is nothing to subscribe to. */
const keepWatching = () => () => undefined;

const readThemeRoot = (): HTMLElement => findThemeRoot(document);

const readNothingOnTheServer = (): null => null;

/** Portal container inside the themed element, since the end of the page is not themed. Null until mounted. */
export const useThemeRoot = (): HTMLElement | null =>
  useSyncExternalStore(keepWatching, readThemeRoot, readNothingOnTheServer);
