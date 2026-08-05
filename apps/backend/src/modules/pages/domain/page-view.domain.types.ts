import type { SchemaBoardColumn, SchemaPropertyValues } from '../../../common/domain/schema.domain.types';

export interface PageViewRow {
  readonly id: string;
  readonly order: number;
  readonly propertyValues: SchemaPropertyValues | null;
}

type GroupablePageViewRow = PageViewRow & { readonly propertyValues: SchemaPropertyValues };

export type PageBoardColumn = SchemaBoardColumn<GroupablePageViewRow>;

export type PageViewOutcome =
  | { readonly kind: 'TABLE_ROWS'; readonly rows: readonly PageViewRow[] }
  | { readonly kind: 'BOARD_COLUMNS'; readonly columns: readonly PageBoardColumn[] }
  | { readonly kind: 'BOARD_MISSING_GROUPING_PROPERTY' };
