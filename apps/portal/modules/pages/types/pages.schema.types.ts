import type { PageLifecycle, PagePropertyType, PagePropertyValues, PageViewType } from '@company-brain/shared';

export type { PagePropertyValue, PagePropertyValues } from '@company-brain/shared';

export interface PageSchemaProperty {
  readonly key: string;
  readonly label: string;
  readonly type: PagePropertyType;
  readonly required: boolean;
  readonly options: readonly string[] | null;
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

export interface PageBoardColumn {
  readonly key: string;
  readonly label: string;
  readonly rows: readonly PageRow[];
}

export type PageViewOutcome =
  | { readonly kind: 'TABLE_ROWS'; readonly rows: readonly PageRow[] }
  | { readonly kind: 'BOARD_COLUMNS'; readonly columns: readonly PageBoardColumn[] }
  | { readonly kind: 'BOARD_MISSING_GROUPING_PROPERTY' };
