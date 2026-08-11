'use client';

import type { ReactNode } from 'react';

interface IProps {
  readonly children: ReactNode;
  readonly label: string;
  readonly labelId: string;
}

export const PagesMetadataRow = ({ children, label, labelId }: IProps) => (
  <div className="flex min-h-11 items-center gap-3">
    <span className="w-24 shrink-0 truncate text-muted-foreground text-sm sm:w-36" id={labelId}>
      {label}
    </span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);
