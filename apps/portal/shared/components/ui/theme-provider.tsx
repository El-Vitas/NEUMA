'use client';

import { ThemeProvider as NextThemesProvider, useTheme as useNextThemes } from 'next-themes';
import { useSyncExternalStore } from 'react';

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" disableTransitionOnChange={true} enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
};

export { ThemeProvider };

const emptySubscribe = () => () => {};
const getSnapshot = () => 'mounted';

export const useTheme = () => {
  const { theme, setTheme } = useNextThemes();
  const mounted = useSyncExternalStore(emptySubscribe, getSnapshot, () => 'dark');

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const resolvedTheme = mounted === 'mounted' ? theme : 'dark';
  const isDark = resolvedTheme === 'dark';

  return {
    theme: resolvedTheme,
    setTheme,
    toggleTheme,
    mounted: mounted === 'mounted',
    isDark,
  };
};
