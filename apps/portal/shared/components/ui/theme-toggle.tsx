'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/shared/components/ui/theme-provider';

export const ThemeToggle = () => {
  const { isDark, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return <div className="flex size-8 items-center justify-center" />;
  }

  return (
    <button
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex size-8 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
      onClick={toggleTheme}
      title={isDark ? 'Light mode' : 'Dark mode'}
      type="button"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
};
