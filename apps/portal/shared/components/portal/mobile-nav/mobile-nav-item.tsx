'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { MobileNavItemProps } from './types/mobile-nav.types';

export const MobileNavItem = ({ href, label, icon: Icon, active, onClick }: MobileNavItemProps) => (
  <Link
    aria-current={active ? 'page' : undefined}
    className={cn(
      'flex items-center gap-3 rounded-none px-4 py-3 font-medium text-base transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      active ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-accent hover:text-foreground',
    )}
    href={href}
    onClick={onClick}
  >
    <Icon aria-hidden="true" className="size-5" />
    <span>{label}</span>
  </Link>
);
