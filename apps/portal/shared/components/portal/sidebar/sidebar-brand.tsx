'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/shared/components/brand/brand-mark';
import { BrandWordmark } from '@/shared/components/brand/logo';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { Link } from '../../../../i18n/navigation';

interface SidebarBrandProps {
  readonly collapsed: boolean;
}

export const SidebarBrand = ({ collapsed }: SidebarBrandProps) => {
  const t = useTranslations('common');
  return (
    <Link
      aria-label={t('goToDashboard')}
      className={cn('flex justify-center rounded-none', FOCUS_RING_CLASS)}
      href={ROUTES.PORTAL}
    >
      {collapsed ? <BrandMark /> : <BrandWordmark className="py-4" />}
    </Link>
  );
};
