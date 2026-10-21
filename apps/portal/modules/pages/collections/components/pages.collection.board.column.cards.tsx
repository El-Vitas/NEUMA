'use client';

import { cn } from '@/lib/utils';
import { PAGE_VIRTUAL_CARD_HEIGHT } from '../constants/pages.virtualization.constants';
import { usePagesWindowVirtualizer } from '../hooks/use.pages.window-virtualizer';
import type { PageBoardDragController } from '../types/pages.board-drag.types';
import type { PagePersonOption, PageSchemaProperty, PageViewGroup } from '../types/pages.schema.types';
import { PagesCollectionBoardCard } from './pages.collection.board.card';

interface IProps {
  /** Empty when the board has no bands. */
  readonly bandKey: string;
  readonly canDrag: boolean;
  readonly drag: PageBoardDragController;
  readonly group: PageViewGroup;
  /** Whether a card being dragged would land right before this one (null: at the end of the column). */
  readonly isAimingAt: (beforeRowId: null | string) => boolean;
  readonly isCarryingColumn: boolean;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

/** The cards of a column: only the ones in view plus a margin once there are many, and always the one being dragged. */
export const PagesCollectionBoardColumnCards = ({
  bandKey,
  canDrag,
  drag,
  group,
  isAimingAt,
  isCarryingColumn,
  personOptions,
  properties,
  spaceId,
}: IProps) => {
  const draggingPosition = group.rows.findIndex((row) => row.id === drag.draggingRowId);
  const [window, attachContainer] = usePagesWindowVirtualizer<HTMLDivElement>({
    count: group.rows.length,
    estimateSize: PAGE_VIRTUAL_CARD_HEIGHT,
    keepIndex: draggingPosition === -1 ? null : draggingPosition,
  });
  const positions = window.indexes ?? group.rows.map((_row, position) => position);

  return (
    <div ref={attachContainer}>
      {window.before > 0 && <div aria-hidden="true" style={{ height: window.before }} />}
      {positions.map((position) => {
        const row = group.rows[position];
        if (row === undefined) return null;
        return (
          <div data-index={position} key={row.id}>
            <div
              aria-hidden="true"
              className={cn('h-0.5 rounded-full transition-colors', isAimingAt(row.id) && 'bg-primary')}
              data-active={isAimingAt(row.id)}
              data-testid="board-drop-gap"
            />
            <PagesCollectionBoardCard
              bandKey={bandKey}
              canEdit={canDrag}
              drag={drag}
              groupKey={group.key}
              isCarryingColumn={isCarryingColumn}
              nextRowId={group.rows[position + 1]?.id ?? null}
              personOptions={personOptions}
              properties={properties}
              row={row}
              spaceId={spaceId}
            />
          </div>
        );
      })}
      {window.after > 0 && <div aria-hidden="true" style={{ height: window.after }} />}
    </div>
  );
};
