import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  label: string;
  className?: string;
}

export const StatusBadge = ({ label, className }: StatusBadgeProps) => {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium text-xs', className)}>
      {label}
    </span>
  );
};

export type { StatusBadgeProps };
