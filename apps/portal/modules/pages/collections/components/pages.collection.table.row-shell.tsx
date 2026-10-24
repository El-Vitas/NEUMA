'use client';

import type { ReactNode } from 'react';
import { useContext, useState } from 'react';
import { cn } from '@/lib/utils';
import { TableRow } from '@/shared/components/ui/table';
import { PAGE_ROW_ORDERING_CONTEXT } from '../constants/pages.row-context.constants';
import { readRowDropSide } from '../lib/pages.row-ordering.lib';
import type { PageRowDropSide } from '../types/pages.row-ordering.types';

interface IProps {
  readonly children: ReactNode;
  /** Set when the row is one of a windowed list, which reads its height by this number. */
  readonly index?: number;
  readonly rowId: string;
  /** The group the row is drawn in. */
  readonly scope: string;
}

/** A row another can be dropped on, when the table follows its own order, with a line where the dropped one lands. */
export const PagesCollectionTableRowShell = ({ children, index, rowId, scope }: IProps) => {
  const ordering = useContext(PAGE_ROW_ORDERING_CONTEXT);
  const [aimedSide, setAimedSide] = useState<null | PageRowDropSide>(null);
  const isTarget = ordering?.carried?.scope === scope && ordering.carried.rowId !== rowId;

  return (
    <TableRow
      className={cn(
        aimedSide === 'BEFORE' && 'shadow-[inset_0_2px_0_0_var(--color-primary)]',
        aimedSide === 'AFTER' && 'shadow-[inset_0_-2px_0_0_var(--color-primary)]',
      )}
      data-index={index}
      data-row-id={rowId}
      data-scope={scope}
      onDragLeave={() => setAimedSide(null)}
      onDragOver={(event) => {
        if (!isTarget) return;
        event.preventDefault();
        const box = event.currentTarget.getBoundingClientRect();
        setAimedSide(readRowDropSide(event.clientY, { height: box.height, top: box.top }));
      }}
      onDrop={(event) => {
        if (!isTarget || ordering === null) return;
        event.preventDefault();
        const box = event.currentTarget.getBoundingClientRect();
        setAimedSide(null);
        ordering.drop(rowId, scope, readRowDropSide(event.clientY, { height: box.height, top: box.top }));
      }}
    >
      {children}
    </TableRow>
  );
};
