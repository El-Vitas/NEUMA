'use client';

import { useSyncExternalStore } from 'react';
import { findThemeRoot } from '@/shared/lib/theme.lib';

/** The element never changes while the page lives, so there is nothing to listen to. */
const keepWatching = () => () => undefined;

const readThemeRoot = (): HTMLElement => findThemeRoot(document);

const readNothingOnTheServer = (): null => null;

/**
 * Where a dialog or a menu belongs: inside the element that wears the theme,
 * instead of at the end of the page, where nothing is dressed.
 *
 * It is nothing until the page has been drawn, which is when there is an
 * element to point at — and also the only moment anything is drawn outside the
 * flow of the page.
 */
export const useThemeRoot = (): HTMLElement | null =>
  useSyncExternalStore(keepWatching, readThemeRoot, readNothingOnTheServer);
