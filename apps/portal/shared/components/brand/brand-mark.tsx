import { cn } from '@/lib/utils';
import { BRAND_NAME } from '@/shared/constants/brand.constants';

interface IProps {
  className?: string;
}

export const BrandMark = ({ className }: IProps) => (
  <span
    className={cn(
      'flex size-8 items-center justify-center rounded-none bg-sidebar-primary/20 font-mono font-semibold text-sidebar-foreground text-sm',
      className,
    )}
  >
    {BRAND_NAME.charAt(0)}
  </span>
);
