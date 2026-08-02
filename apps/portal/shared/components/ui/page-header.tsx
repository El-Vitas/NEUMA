import type * as React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

const PageHeader = ({ title, subtitle, action, className }: PageHeaderProps) => {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        <h1 className="font-bold text-2xl text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-muted-foreground text-sm">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export type { PageHeaderProps };
export { PageHeader };
