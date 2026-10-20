import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { SharingScope } from '../types/pages.sharing.types';

interface IProps {
  readonly className?: string;
  /** Lets a list draw the badge for every row without deciding, row by row, whether it shows. */
  readonly isVisible?: boolean;
  readonly scope: SharingScope;
}

/** A lock for something that has its own access settings; the words are for those who cannot see the icon. */
export const PagesSharingBadge = ({ className, isVisible = true, scope }: IProps) => {
  const t = useTranslations('pages.sharing');
  if (!isVisible) return null;
  const label = scope === 'page' ? t('badgePage') : t('badgeBlock');

  return (
    <span className={cn('inline-flex shrink-0 items-center text-muted-foreground', className)} title={label}>
      <Lock aria-hidden="true" className="size-3.5" />
      <span className="sr-only">{label}</span>
    </span>
  );
};
