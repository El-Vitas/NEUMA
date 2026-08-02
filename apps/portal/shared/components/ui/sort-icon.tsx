import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SortDirection } from '@/shared/hooks/types/use-sortable.types';

interface SortIconProps {
  readonly isActive: boolean;
  readonly direction: SortDirection;
  readonly className?: string;
}

export const SortIcon = ({ isActive, direction, className }: SortIconProps) => {
  if (!isActive) {
    return <ChevronsUpDown className={cn('ml-1 size-3 text-muted-foreground', className)} />;
  }
  return direction === 'asc' ? (
    <ChevronUp className={cn('ml-1 size-3 text-primary', className)} />
  ) : (
    <ChevronDown className={cn('ml-1 size-3 text-primary', className)} />
  );
};
