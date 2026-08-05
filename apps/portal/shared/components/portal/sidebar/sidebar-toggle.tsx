'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';

interface IProps {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
}

export const SidebarToggle = ({ collapsed, onToggle }: IProps) => {
  const t = useTranslations('common');
  return (
    <button
      aria-label={collapsed ? t('expandMenu') : t('collapseMenu')}
      className={cn(
        'absolute top-20 -right-4 z-20 flex size-11 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground/70 shadow-sm hover:bg-sidebar-accent hover:text-sidebar-foreground',
        FOCUS_RING_CLASS,
      )}
      onClick={onToggle}
      title={collapsed ? t('expandMenu') : t('collapseMenu')}
      type="button"
    >
      {collapsed ? (
        <ChevronRight aria-hidden="true" className="size-4" />
      ) : (
        <ChevronLeft aria-hidden="true" className="size-4" />
      )}
    </button>
  );
};
