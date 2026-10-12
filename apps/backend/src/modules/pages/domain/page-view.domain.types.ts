import type { SchemaPropertyValues, SchemaRowBand, SchemaRowGroup } from '../../../common/domain/schema.domain.types';

export interface PageViewRow {
  readonly id: string;
  readonly order: number;
  readonly propertyValues: SchemaPropertyValues | null;
}

export type GroupablePageViewRow = PageViewRow & { readonly propertyValues: SchemaPropertyValues };

export type PageViewGroup = SchemaRowGroup<GroupablePageViewRow>;

export type PageViewBand = SchemaRowBand<GroupablePageViewRow>;

export type PageViewOutcome =
  | { readonly bands: readonly PageViewBand[]; readonly kind: 'BANDED_ROWS' }
  | { readonly kind: 'FLAT_ROWS'; readonly rows: readonly PageViewRow[] }
  | { readonly groups: readonly PageViewGroup[]; readonly kind: 'GROUPED_ROWS' }
  | { readonly kind: 'MISSING_GROUPING_PROPERTY' };
