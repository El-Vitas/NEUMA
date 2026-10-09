import type * as React from 'react';

interface IProps {
  readonly action?: React.ReactNode;
  readonly id?: string;
  readonly subtitle?: string;
  readonly title: string;
}

export const SectionHeader = ({ action, id, subtitle, title }: IProps) => (
  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
    <div className="min-w-0 max-w-prose">
      <h2 className="font-semibold text-foreground text-xl" id={id}>
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-muted-foreground text-sm">{subtitle}</p>}
    </div>
    {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
  </div>
);
