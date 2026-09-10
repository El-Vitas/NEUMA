'use client';

import { Maximize2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { DragEvent, KeyboardEvent } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Card } from '@/shared/components/ui/card';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { PagesSidePanelLink } from '../../navigation/components/pages.side-panel.link';
import { readDropSideFromPointer } from '../lib/pages.board-drag.lib';
import type { PageBoardDragController } from '../types/pages.board-drag.types';
import type { PagePersonOption, PageRow, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesCollectionBoardCardProperties } from './pages.collection.board.card-properties';

interface IProps {
  /** La banda en la que está la tarjeta. Vacío cuando el tablero no tiene bandas. */
  readonly bandKey: string;
  readonly canEdit: boolean;
  readonly drag: PageBoardDragController;
  readonly groupKey: string;
  /** La tarjeta que sigue a esta en su columna, que es el hueco de debajo. */
  readonly nextRowId: null | string;
  readonly personOptions: readonly PagePersonOption[];
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
export const PagesCollectionBoardCard = ({
  bandKey,
  canEdit,
  drag,
  groupKey,
  nextRowId,
  personOptions,
  properties,
  row,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages');

  /**
   * A qué hueco apunta la mano mientras pasa por encima de esta tarjeta: al de
   * arriba o al de abajo. Se detiene aquí para que la columna no responda por
   * ella y termine señalando siempre el final.
   */
  const aimAtNearestGap = (event: DragEvent<HTMLDivElement>): void => {
    if (!canEdit) return;
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
      <div className="flex items-start justify-between gap-2">
        {/* El título completo, aunque ocupe dos líneas: una tarea cortada a la mitad no se reconoce. */}
        <PagesSidePanelLink className="min-w-0 flex-1 font-medium underline-offset-2 hover:underline" pageId={row.id}>
          {row.title.length > 0 ? row.title : t('untitled')}
        </PagesSidePanelLink>
        <Link
          aria-label={t('sidePanel.openFullPage')}
          className="-m-2 rounded-none p-2 text-muted-foreground hover:text-foreground"
          href={ROUTES.PORTAL_SPACE_PAGE(spaceId, row.id)}
          title={t('sidePanel.openFullPage')}
        >
          <Maximize2 aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
      <PagesCollectionBoardCardProperties personOptions={personOptions} properties={properties} row={row} />
    </Card>
  );
};
