'use client';

import { DynamicIcon } from 'lucide-react/dynamic';
import { cn } from '@/lib/utils';
import { PAGE_ICON_COLOR_STYLE_CLASSES } from '../constants/pages.icon.colors.constants';
import { isOfferedPageIconSymbol } from '../lib/pages.icon.lib';
import type { PageIconColor } from '../types/pages.icon.types';

interface IProps {
  readonly className?: string;
  readonly color?: PageIconColor;
  readonly name: string;
}

/**
 * One drawn symbol, fetched only when something actually asks for it.
 *
 * A name that this product does not draw shows nothing rather than breaking
 * what surrounds it: whatever the page is called still matters more than the
 * mark beside it.
 */
export const PagesIconSymbol = ({ className, color = 'default', name }: IProps) => {
  if (!isOfferedPageIconSymbol(name)) return null;

  return (
    <DynamicIcon
      aria-hidden="true"
      className={cn('size-[1em]', PAGE_ICON_COLOR_STYLE_CLASSES[color], className)}
      name={name}
    />
  );
};
