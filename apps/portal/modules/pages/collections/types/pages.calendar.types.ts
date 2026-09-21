import type { PageCalendarDay } from '@company-brain/shared';
import type { PageRow } from './pages.schema.types';

/** Un día de la rejilla con lo que cayó en él. */
export interface PageCalendarCell extends PageCalendarDay {
  readonly rows: readonly PageRow[];
}

/** Llevar una entrada a otro día: lo que se lleva en la mano, y lo que queda escrito. */
export interface PagesCalendarMoving {
  /** La entrada que se está llevando, o ninguna. */
  readonly carried: null | string;
  readonly dateOf: (row: PageRow, stored: null | string) => null | string;
  /** Suelta la mano sin escribir nada: el gesto se abandonó. */
  readonly forget: () => void;
  readonly moveTo: (rowId: string, date: string) => void;
  readonly take: (rowId: string) => void;
}
