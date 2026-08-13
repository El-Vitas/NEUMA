'use client';

import { useCallback, useEffect, useState } from 'react';
import { DARK_THEME_MEDIA_QUERY } from '@/shared/constants/theme.constants';
import { applyThemeReading, findThemeRoot, resolveThemeReading } from '@/shared/lib/theme.lib';
import { rememberThemeAction } from '@/shared/server/actions/theme.actions';
import type { ThemeChoice } from '@/shared/types/theme.types';

const prefersDarkNow = (): boolean => globalThis.matchMedia(DARK_THEME_MEDIA_QUERY).matches;

/**
 * Dresses the page at once and tells the server, which is what makes the next
 * visit arrive already dressed instead of turning dark in front of the reader.
 */
const rememberTheme = (choice: ThemeChoice, prefersDark: boolean): void => {
  const reading = resolveThemeReading(choice, prefersDark);
  applyThemeReading(findThemeRoot(document), reading);
  void rememberThemeAction({ choice, reading });
};

/**
 * The theme in use and how to change it.
 *
 * The page arrives already dressed by the server, which knows what was chosen
 * and how this browser last resolved it; this keeps that answer true while the
 * system is being followed.
 */
export const useTheme = (
  initialChoice: ThemeChoice,
): { readonly choice: ThemeChoice; readonly choose: (choice: ThemeChoice) => void } => {
  const [choice, setChoice] = useState<ThemeChoice>(initialChoice);

  useEffect(() => {
    if (choice !== 'system') return;
    const system = globalThis.matchMedia(DARK_THEME_MEDIA_QUERY);
    const follow = (): void => rememberTheme('system', system.matches);
    follow();
    system.addEventListener('change', follow);
    return () => system.removeEventListener('change', follow);
  }, [choice]);

  const choose = useCallback((nextChoice: ThemeChoice): void => {
    rememberTheme(nextChoice, prefersDarkNow());
    setChoice(nextChoice);
  }, []);

  return { choice, choose };
};
