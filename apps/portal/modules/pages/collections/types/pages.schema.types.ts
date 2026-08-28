import type {
  PageLifecycle,
  PageOptionColor,
  PagePropertyOption,
  PagePropertyType,
  PagePropertyValues,
  PageViewType,
} from '@company-brain/shared';

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

export type PageViewOutcome =
  | { readonly kind: 'FLAT_ROWS'; readonly rows: readonly PageRow[] }
  | { readonly kind: 'GROUPED_ROWS'; readonly groups: readonly PageViewGroup[] }
  | { readonly kind: 'MISSING_GROUPING_PROPERTY' };

export type PageViewFlatOutcome = Extract<PageViewOutcome, { readonly kind: 'FLAT_ROWS' }>;
export type PageViewGroupedOutcome = Extract<PageViewOutcome, { readonly kind: 'GROUPED_ROWS' }>;
