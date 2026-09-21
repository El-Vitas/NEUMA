import type { SchemaPropertyValues, SchemaRowBand, SchemaRowGroup } from '../../../common/domain/schema.domain.types';

export interface PageViewRow {
  readonly id: string;
  readonly order: number;
  readonly propertyValues: SchemaPropertyValues | null;
}

export type GroupablePageViewRow = PageViewRow & { readonly propertyValues: SchemaPropertyValues };

export type PageViewGroup = SchemaRowGroup<GroupablePageViewRow>;

export type PageViewBand = SchemaRowBand<GroupablePageViewRow>;

/**
 * What a view hands over, named after the shape the rows arrive in rather than
 * after the view that asked for them. A gallery reads its rows the same way a
 * table does, so it needs no outcome of its own.
 */
export type PageViewOutcome =
  /** En rejilla: una banda por valor de la segunda agrupación, y dentro las columnas de la primera. */
  | { readonly bands: readonly PageViewBand[]; readonly kind: 'BANDED_ROWS' }
  | { readonly kind: 'FLAT_ROWS'; readonly rows: readonly PageViewRow[] }
  | { readonly groups: readonly PageViewGroup[]; readonly kind: 'GROUPED_ROWS' }
  | { readonly kind: 'MISSING_GROUPING_PROPERTY' };
