'use client';

import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PagesIconSymbol } from '@/modules/pages/components/pages.icon.symbol';
import { resolvePageIconImageUrl } from '@/modules/pages/lib/pages.icon.lib';
import type { PageIcon } from '@/modules/pages/types/pages.icon.types';
import { ImageWithFallback } from '@/shared/components/ui/image-with-fallback';

interface IProps {
  readonly className?: string;
  readonly icon: null | PageIcon;
}

/**
 * The mark a page wears, whichever kind it chose — and the one it wears when it
 * chose nothing.
 *
 * A page with no icon of its own is not a page missing its icon: it wears the
 * plain document mark, the same one it shows in the tree, so what a new page
 * looks like is the same thing everywhere rather than an empty space here and a
 * drawing there.
 */
export const PageIconGlyph = ({ className, icon }: IProps) => {
  if (icon === null) return <FileText aria-hidden="true" className={cn('size-[0.7em]', className)} />;

  if (icon.kind === 'image') {
    /** Asked for by the browser itself: the optimiser fetches from the server, where nobody is signed in. */
    return (
      <ImageWithFallback
        alt=""
        className="object-cover"
        fill
        sizes="64px"
        src={resolvePageIconImageUrl(icon)}
        unoptimized
      />
    );
  }

  if (icon.kind === 'symbol') {
    return <PagesIconSymbol className={className} color={icon.color} name={icon.name} />;
  }

  return icon.value;
};
