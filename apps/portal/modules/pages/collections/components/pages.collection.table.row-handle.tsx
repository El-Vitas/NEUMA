'use client';

import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { useContext } from 'react';
import { PAGE_ROW_ORDERING_CONTEXT } from '../constants/pages.row-context.constants';
import { findNeighbourRowId, resolveRowStepAnchor } from '../lib/pages.row-ordering.lib';

interface IProps {
  readonly rowId: string;
  /** The group the row is drawn in: it can only be put among the rows of that group. */
  readonly scope: string;
  readonly title: string;
}

/** The grip a row is moved by, with Alt and the up and down arrows as the way for whoever cannot drag. */
export const PagesCollectionTableRowHandle = ({ rowId, scope, title }: IProps) => {
  const t = useTranslations('pages.collection');
  const ordering = useContext(PAGE_ROW_ORDERING_CONTEXT);
  if (ordering === null) return null;

  const stepOnArrow = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    const row = event.currentTarget.closest('tr');
    if (row === null) return;
    const anchor = resolveRowStepAnchor(
      event.key === 'ArrowUp' ? 'UP' : 'DOWN',
      findNeighbourRowId(row, 'UP', scope),
      findNeighbourRowId(row, 'DOWN', scope),
    );
    if (anchor !== null) ordering.move(rowId, anchor);
  };

  return (
    <button
      aria-label={t('moveRow', { title })}
      className="mr-1 -ml-1 inline-flex cursor-grab align-middle text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      data-testid="table-row-handle"
      disabled={ordering.isBusy}
      draggable
      onDragEnd={ordering.forget}
      onDragStart={() => ordering.take(rowId, scope)}
      onKeyDown={stepOnArrow}
      type="button"
    >
      <GripVertical aria-hidden="true" className="size-3.5" />
    </button>
  );
};
