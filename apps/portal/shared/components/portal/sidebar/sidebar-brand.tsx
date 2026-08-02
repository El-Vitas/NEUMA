'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/shared/components/brand/brand-mark';
import { BrandWordmark } from '@/shared/components/brand/logo';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

interface SidebarBrandProps {
  readonly collapsed: boolean;
}

export const SidebarBrand = ({ collapsed }: SidebarBrandProps) => (
  <Link
    aria-label="Ir al dashboard"
    className={cn('flex justify-center rounded-none', FOCUS_RING_CLASS)}
    href={ROUTES.PORTAL}
  >
    {collapsed ? <BrandMark /> : <BrandWordmark className="py-4" />}
  </Link>
);
