'use client';

import type { ReactNode } from 'react';
import { TableRow } from '@/shared/components/ui/table';

interface IProps {
  readonly children: ReactNode;
  /** Set when the row is one of a windowed list, which reads its height by this number. */
  readonly index?: number | undefined;
}

export const PagesCollectionTableRowShell = ({ children, index }: IProps) => (
  <TableRow data-index={index}>{children}</TableRow>
);
