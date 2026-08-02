'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useRouter } from '../../../i18n/navigation';

interface BackButtonProps {
  href?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
}

const BackButton = ({ href, label, onClick, className }: BackButtonProps) => {
  const router = useRouter();
  const t = useTranslations('common');
  const resolvedLabel = label ?? t('back');

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <button
      aria-label={resolvedLabel}
      className={cn(
        'inline-flex items-center gap-2 rounded-none border border-border bg-background px-3 py-2 text-foreground text-sm transition-colors hover:bg-accent',
        className,
      )}
      onClick={handleClick}
      type="button"
    >
      <ArrowLeft className="size-4" />
      {resolvedLabel}
    </button>
  );
};

export type { BackButtonProps };
export { BackButton };
