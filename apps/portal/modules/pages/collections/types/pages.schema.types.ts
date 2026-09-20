import type {
  PageLifecycle,
  PageOptionColor,
  PagePropertyOption,
  PagePropertyType,
  PagePropertyValues,
  PageViewType,
} from '@company-brain/shared';
import type { ReactNode } from 'react';

export type { PagePropertyValue, PagePropertyValues } from '@company-brain/shared';

export interface PageSchemaProperty {
  readonly key: string;
  readonly label: string;
  readonly type: PagePropertyType;
  readonly required: boolean;
  readonly options: readonly PagePropertyOption[] | null;
}

export interface PagePersonOption {
  readonly email: string;
  readonly id: string;
  readonly name: string;
}

export interface PageSchemaView {
  readonly name: string;
  readonly type: PageViewType;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly isDefault: boolean;
}

export interface PageSchema {
  readonly pageId: string;
  readonly spaceId: string;
  readonly properties: readonly PageSchemaProperty[];
  readonly views: readonly PageSchemaView[];
}

export interface PageRow {
  readonly id: string;
  readonly parentId: string | null;
  readonly spaceId: string;
  readonly title: string;
  readonly propertyValues: PagePropertyValues | null;
  readonly order: number;
  readonly lifecycle: PageLifecycle;
}

export interface PageViewGroup {
  readonly color: PageOptionColor | null;
  readonly key: string;
  readonly label: string;
  readonly rows: readonly PageRow[];
}

/**
 * Un grupo de la tabla tal como llega a quien lo dibuja: lo que hay que decir de
 * él, y sus filas ya dibujadas.
 *
 * Las filas vienen hechas porque las dibuja el servidor y el grupo solo decide
 * si se enseñan: plegar es dejar de mirar, no volver a construir nada.
 */
export interface PageTableGroup {
  readonly color: PageOptionColor | null;
  readonly key: string;
  readonly label: string;
  readonly rowCount: number;
  readonly rows: ReactNode;
}

/** Una franja que cruza todas las columnas, con lo que a cada una le toca dentro de ella. */
export interface PageViewBand {
  readonly color: PageOptionColor | null;
  readonly groups: readonly PageViewGroup[];
  readonly key: string;
  readonly label: string;
}

export type PageViewOutcome =
  | { readonly bands: readonly PageViewBand[]; readonly kind: 'BANDED_ROWS' }
  | { readonly kind: 'FLAT_ROWS'; readonly rows: readonly PageRow[] }
  | { readonly groups: readonly PageViewGroup[]; readonly kind: 'GROUPED_ROWS' }
  | { readonly kind: 'MISSING_GROUPING_PROPERTY' };

/**
 * Lo que la colección contesta al pedirle una vista: sus filas repartidas como
 * esa vista las lee, y de cuántas salieron.
 */
export interface PageViewReading {
  readonly outcome: PageViewOutcome;
  /** Las que el filtro dejó pasar. */
  readonly rowCount: number;
  /** Todas las que la colección guarda, filtre o no la vista. */
  readonly totalRowCount: number;
}

export type PageViewFlatOutcome = Extract<PageViewOutcome, { readonly kind: 'FLAT_ROWS' }>;
export type PageViewGroupedOutcome = Extract<PageViewOutcome, { readonly kind: 'GROUPED_ROWS' }>;
export type PageViewBandedOutcome = Extract<PageViewOutcome, { readonly kind: 'BANDED_ROWS' }>;
