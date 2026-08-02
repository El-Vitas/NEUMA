'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from '@/shared/components/ui/theme-provider';

export const ThemeToggle = () => {
  const t = useTranslations('common');
  const { isDark, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return <div className="flex size-8 items-center justify-center" />;
  }

  return (
    <button
      aria-label={isDark ? t('switchToLightMode') : t('switchToDarkMode')}
      className="flex size-8 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
      onClick={toggleTheme}
      title={isDark ? t('lightMode') : t('darkMode')}
      type="button"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
};
