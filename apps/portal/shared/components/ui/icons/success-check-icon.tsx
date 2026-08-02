import { cn } from '@/lib/utils';
import type { IconProps } from '@/shared/types/icons';

export const SuccessCheckIcon = ({ className }: IconProps) => (
  <svg className={cn('size-10 text-primary', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
  </svg>
);
