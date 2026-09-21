import type { PageViewOutcome } from '../domain/page-view.domain.types';

/**
 * Lo que una vista entrega: sus filas repartidas como esa vista las lee, y de
 * cuántas salieron.
 *
 * Las dos cuentas van juntas porque solas no dicen nada: «3 filas» no distingue
 * una colección de tres de otra de cuarenta con un filtro puesto, y saber que
 * hay cuarenta no dice cuántas se están viendo.
 */
export interface PageViewSummary {
  /** Si la colección guardaba más filas de las que se trajeron. */
  readonly hasMore: boolean;
  readonly outcome: PageViewOutcome;
  /** Las que el filtro dejó pasar. */
  readonly rowCount: number;
  readonly spaceId: string;
  /** Todas las que se trajeron, filtre o no la vista. */
  readonly totalRowCount: number;
}
