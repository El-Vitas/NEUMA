'use client';

import { Menu, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';

interface TopbarProps {
  onMenuClick?: () => void;
  onSearchClick: () => void;
}

export const Topbar = ({ onMenuClick, onSearchClick }: TopbarProps) => {
  const t = useTranslations('common');
  const navigation = useTranslations('navigation');

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-border border-b bg-background px-4 sm:px-6">
      <button
        aria-label={t('menu')}
        className={`flex size-11 items-center justify-center rounded-none text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden ${FOCUS_RING_CLASS}`}
        onClick={onMenuClick}
        type="button"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          aria-label={navigation('search')}
          className={`flex min-h-11 items-center gap-2 px-3 text-muted-foreground hover:bg-accent hover:text-foreground ${FOCUS_RING_CLASS}`}
          onClick={onSearchClick}
          type="button"
        >
          <Search aria-hidden="true" className="size-4" />
          <span className="hidden text-sm sm:inline">{navigation('search')}</span>
          <kbd className="hidden border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground md:inline">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
};
