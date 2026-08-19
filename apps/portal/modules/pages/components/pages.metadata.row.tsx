'use client';

import type { ReactNode } from 'react';

interface IProps {
  readonly children: ReactNode;
  readonly label: string;
  readonly labelId: string;
}

export const PagesMetadataRow = ({ children, label, labelId }: IProps) => (
  <div className="flex flex-col gap-1 py-1 sm:min-h-11 sm:flex-row sm:items-center sm:gap-3 sm:py-0">
    <span className="text-muted-foreground text-sm sm:w-36 sm:shrink-0 sm:truncate" id={labelId}>
      {label}
    </span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);
