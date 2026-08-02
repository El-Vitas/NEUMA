import { cn } from '@/lib/utils';
import type { IconProps } from '@/shared/types/icons';

export const CheckIcon = ({ className }: IconProps) => (
  <svg className={cn('size-5', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
  </svg>
);
