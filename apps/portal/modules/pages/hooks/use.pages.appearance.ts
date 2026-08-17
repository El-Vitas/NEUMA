'use client';

import { useEffect, useRef, useState } from 'react';
import { PAGE_APPEARANCE_DEFAULT_PREFERENCES } from '../constants/pages.appearance.constants';
import {
  buildPageAppearanceStorageKey,
  parsePageAppearancePreferences,
  serializePageAppearancePreferences,
} from '../lib/pages.appearance.lib';
import type {
  PageAppearancePreferences,
  PageAppearanceTextSize,
  PageAppearanceTypography,
  PagesAppearanceResult,
} from '../types/pages.appearance.types';

/**
 * Reads and keeps a page's own look, kept in the browser rather than fetched:
 * the same way `PagesOutline` keeps whether its index is hidden. The choice is
 * read after mount, never during the first render, so the page it draws on the
 * server and the page it draws right after never disagree.
 */
export const usePagesAppearance = (pageId: string | null): PagesAppearanceResult => {
  const [preferences, setPreferences] = useState<PageAppearancePreferences>(PAGE_APPEARANCE_DEFAULT_PREFERENCES);
  const hasOwnChoice = useRef(false);
  const hasReadStorageKey = useRef<string | null>(null);
  const storageKey = buildPageAppearanceStorageKey(pageId);

  useEffect(() => {
    hasOwnChoice.current = false;
    if (hasReadStorageKey.current !== storageKey) {
      setPreferences(parsePageAppearancePreferences(localStorage.getItem(storageKey)));
    }
    hasReadStorageKey.current = storageKey;
  }, [storageKey]);

  useEffect(() => {
    if (!hasOwnChoice.current) return;
    localStorage.setItem(storageKey, serializePageAppearancePreferences(preferences));
  }, [preferences, storageKey]);

  const updatePreferences = (patch: Partial<PageAppearancePreferences>): void => {
    hasOwnChoice.current = true;
    setPreferences((current) => ({ ...current, ...patch }));
  };

  return {
    preferences,
    setFullWidth: (fullWidth: boolean) => updatePreferences({ fullWidth }),
    setTextSize: (textSize: PageAppearanceTextSize) => updatePreferences({ textSize }),
    setTypography: (typography: PageAppearanceTypography) => updatePreferences({ typography }),
  };
};
