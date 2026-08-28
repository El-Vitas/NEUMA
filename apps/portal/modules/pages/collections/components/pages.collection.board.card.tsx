'use client';

import { Maximize2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Card } from '@/shared/components/ui/card';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { buildPagesSidePanelQueryHref } from '../../navigation/lib/pages.side-panel.lib';
import type { PageBoardDragController } from '../types/pages.board-drag.types';
import type { PageRow, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesCollectionBoardCardProperties } from './pages.collection.board.card-properties';

interface IProps {
  readonly canEdit: boolean;
  readonly drag: PageBoardDragController;
  readonly groupKey: string;
  readonly properties: readonly PageSchemaProperty[];
  readonly row: PageRow;
  readonly spaceId: string;
}

/**
 * One row of a collection as a card on a board.
 *
 * It can be carried with the pointer or sent to the next column with the arrow
 * keys while it has focus. Both do the same thing, because a board that only
 * answers to dragging leaves out whoever cannot drag.
 */
export const PagesCollectionBoardCard = ({ canEdit, drag, groupKey, properties, row, spaceId }: IProps) => {
  const t = useTranslations('pages');

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
      className={cn('gap-2 p-3 text-sm', canEdit && 'cursor-grab', drag.draggingRowId === row.id && 'opacity-50')}
      data-testid="collection-board-card"
      draggable={canEdit}
      onDragEnd={drag.onDragEnd}
      onDragStart={() => drag.onDragStart(row.id, groupKey)}
      onKeyDown={moveOnArrow}
      tabIndex={canEdit ? 0 : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <Link className="underline-offset-2 hover:underline" href={buildPagesSidePanelQueryHref(row.id)}>
          {row.title.length > 0 ? row.title : t('untitled')}
        </Link>
        <Link
          aria-label={t('sidePanel.openFullPage')}
          className="-m-2 rounded-none p-2 text-muted-foreground hover:text-foreground"
          href={ROUTES.PORTAL_SPACE_PAGE(spaceId, row.id)}
          title={t('sidePanel.openFullPage')}
        >
          <Maximize2 aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
      <PagesCollectionBoardCardProperties properties={properties} row={row} />
    </Card>
  );
};
