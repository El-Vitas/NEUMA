'use client';

import { useTranslations } from 'next-intl';
import type { DragEvent, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/shared/components/ui/card';
import { readDropSideFromPointer } from '../lib/pages.board-drag.lib';
import type { PageBoardDragController } from '../types/pages.board-drag.types';
import type { PagePersonOption, PageRow, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesCollectionCardProperties } from './pages.collection.card-properties';
import { PagesCollectionRowTitle } from './pages.collection.row-title';

interface IProps {
  /** Empty when the board has no bands. */
  readonly bandKey: string;
  readonly canEdit: boolean;
  readonly drag: PageBoardDragController;
  readonly groupKey: string;
  /** A card is not a drop target for a column, so while one is dragged the card lets the column below answer. */
  readonly isCarryingColumn: boolean;
  readonly nextRowId: null | string;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly row: PageRow;
  readonly spaceId: string;
}

/** Movable by keyboard (Alt + arrows) as well as by drag, so the board does not exclude whoever cannot drag. */
export const PagesCollectionBoardCard = ({
  bandKey,
  canEdit,
  drag,
  groupKey,
  isCarryingColumn,
  nextRowId,
  personOptions,
  properties,
  row,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages');

  /** Stops the event so the column does not answer and always point at its end; a dragged column passes through. */
  const aimAtNearestGap = (event: DragEvent<HTMLDivElement>): void => {
    if (!canEdit || isCarryingColumn) return;
    event.preventDefault();
    event.stopPropagation();
    const card = event.currentTarget.getBoundingClientRect();
    const side = readDropSideFromPointer(event.clientY, { height: card.height, top: card.top });
    drag.onDragOver({ bandKey, beforeRowId: side === 'BEFORE' ? row.id : nextRowId, groupKey });
  };

  const moveOnArrow = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!canEdit || !event.altKey) return;
    if (event.key === 'ArrowRight') drag.moveByKeyboard(row.id, groupKey, 'FORWARD');
    else if (event.key === 'ArrowLeft') drag.moveByKeyboard(row.id, groupKey, 'BACKWARD');
    else return;
    event.preventDefault();
  };

  return (
    <Card
      aria-label={canEdit ? t('collection.cardMoveHint', { title: row.title }) : undefined}
      className={cn(
        'mt-1 gap-2 rounded-md border-border/60 p-3 text-sm shadow-xs transition-shadow first:mt-0 hover:shadow-sm',
        canEdit && 'cursor-grab active:cursor-grabbing',
        drag.draggingRowId === row.id && 'opacity-40',
      )}
      data-testid="collection-board-card"
      draggable={canEdit}
      onDragEnd={drag.onDragEnd}
      onDragOver={aimAtNearestGap}
      onDragStart={() => drag.onDragStart(row.id, groupKey, bandKey)}
      onKeyDown={moveOnArrow}
      tabIndex={canEdit ? 0 : undefined}
    >
      <PagesCollectionRowTitle
        className="w-full items-start justify-between gap-2 font-medium"
        openFullPageLabel={t('sidePanel.openFullPage')}
        row={row}
        spaceId={spaceId}
        untitledLabel={t('untitled')}
      />
      <PagesCollectionCardProperties
        direction="COLUMN"
        personOptions={personOptions}
        properties={properties}
        row={row}
      />
    </Card>
  );
};
