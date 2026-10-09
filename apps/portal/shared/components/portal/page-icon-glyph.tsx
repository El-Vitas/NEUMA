'use client';

import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PagesIconSymbol } from '@/modules/pages/appearance/components/pages.icon.symbol';
import { resolvePageIconImageUrl } from '@/modules/pages/appearance/lib/pages.icon.lib';
import type { PageIcon } from '@/modules/pages/appearance/types/pages.icon.types';
import { ImageWithFallback } from '@/shared/components/ui/image-with-fallback';

interface IProps {
  readonly className?: string;
  readonly icon: null | PageIcon;
}

export const PageIconGlyph = ({ className, icon }: IProps) => {
  if (icon === null) return <FileText aria-hidden="true" className={cn('size-[0.7em]', className)} />;

  if (icon.kind === 'image') {
    /** The browser must fetch it: the image optimiser runs on the server, where nobody is signed in. */
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
