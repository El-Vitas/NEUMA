'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  href?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
}

const BackButton = ({ href, label = 'Volver', onClick, className }: BackButtonProps) => {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <button
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-2 rounded-none border border-border bg-background px-3 py-2 text-foreground text-sm transition-colors hover:bg-accent',
        className,
      )}
      onClick={handleClick}
      type="button"
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  );
};

export type { BackButtonProps };
export { BackButton };
