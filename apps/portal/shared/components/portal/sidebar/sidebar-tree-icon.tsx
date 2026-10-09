'use client';

import type { PageIcon } from '@company-brain/shared';
import { FileText, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageIconGlyph } from '@/shared/components/portal/page-icon-glyph';

interface IProps {
  readonly className?: string;
  readonly fallback?: LucideIcon;
  readonly icon: null | PageIcon;
}

/**
 * Drawn at the size of the default mark so a chosen icon does not look smaller. A server component caller
 * cannot pass a fallback component across the boundary and gets the page mark.
 */
export const SidebarTreeIcon = ({ className: sizeClass = 'size-3.5', fallback: Fallback = FileText, icon }: IProps) => {
  if (icon === null) return <Fallback aria-hidden="true" className={cn(sizeClass, 'shrink-0')} />;

  if (icon.kind === 'image') {
    return (
      <span aria-hidden="true" className={cn('relative shrink-0 overflow-hidden rounded-xs', sizeClass)}>
        <PageIconGlyph icon={icon} />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={cn('grid shrink-0 place-items-center text-sm leading-none', sizeClass)}>
      <PageIconGlyph className={sizeClass} icon={icon} />
    </span>
  );
};
