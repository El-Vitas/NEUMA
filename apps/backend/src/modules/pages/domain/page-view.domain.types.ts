import type { SchemaPropertyValues, SchemaRowGroup } from '../../../common/domain/schema.domain.types';

export interface PageViewRow {
  readonly id: string;
  readonly order: number;
  readonly propertyValues: SchemaPropertyValues | null;
}

type GroupablePageViewRow = PageViewRow & { readonly propertyValues: SchemaPropertyValues };

export type PageViewGroup = SchemaRowGroup<GroupablePageViewRow>;

/**
 * What a view hands over, named after the shape the rows arrive in rather than
 * after the view that asked for them. A gallery reads its rows the same way a
 * table does, so it needs no outcome of its own.
 */
export type PageViewOutcome =
  | { readonly kind: 'FLAT_ROWS'; readonly rows: readonly PageViewRow[] }
  | { readonly kind: 'GROUPED_ROWS'; readonly groups: readonly PageViewGroup[] }
  | { readonly kind: 'MISSING_GROUPING_PROPERTY' };
