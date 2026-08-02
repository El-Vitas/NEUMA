import { cn } from '@/lib/utils';
import { BRAND_NAME } from '@/shared/constants/brand.constants';

interface LogoProps {
  className?: string;
}

export const BrandWordmark = ({ className }: LogoProps) => (
  <span className={cn('font-mono font-semibold text-sidebar-foreground text-xl tracking-tight', className)}>
    {BRAND_NAME}
  </span>
);
