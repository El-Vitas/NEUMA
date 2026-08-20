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
 * The face a page or a space wears in the sidebar, which is where it is looked for.
 *
 * Whatever was chosen is drawn at the size of the plain mark it replaces: a
 * chosen icon that comes out smaller than the default one reads as a mistake,
 * and it breaks the line the names are read down. What that plain mark is, and
 * how big the line is, both depend on where this stands, so the caller says —
 * unless the caller is a server component, which cannot hand a drawing across
 * that boundary at all, and takes the page's own mark.
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
