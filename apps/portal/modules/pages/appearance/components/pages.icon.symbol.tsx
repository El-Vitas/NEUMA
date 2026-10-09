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

/** Fetched on demand; an unknown name renders nothing instead of breaking the surrounding title. */
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
