import type * as React from 'react';
import { cn } from '@/lib/utils';

interface IProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly action?: React.ReactNode;
  readonly className?: string;
}

const PageHeader = ({ title, subtitle, action, className }: IProps) => {
  return (
    <div className={cn('flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center', className)}>
      <div className="min-w-0">
        <h1 className="font-bold font-display text-3xl text-foreground tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground text-sm">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
};

export { PageHeader };
