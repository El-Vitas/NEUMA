import type { DatabasePropertyType, DatabaseViewType, JsonObject } from '@neuma/db';
import type {
  PageOptionColor,
  PagePropertyConfig,
  PagePropertyOption,
  PagePropertyValue,
  PagePropertyValues,
} from '@neuma/shared';

export type SchemaPropertyValue = PagePropertyValue;
export type SchemaPropertyValues = PagePropertyValues;

export interface SchemaPropertyDefinition {
  readonly config: PagePropertyConfig;
  readonly key: string;
  readonly label: string;
  readonly type: DatabasePropertyType;
  readonly required: boolean;
  readonly options: readonly PagePropertyOption[] | null;
}

export interface SchemaValuesCheck {
  readonly personIds?: ReadonlySet<string> | undefined;
  /** The keys the caller writes now. Without it every key is a write, as when a row is created. */
  readonly written?: readonly string[] | undefined;
}

/** What a view must have to be checked: a configuration as read, from storage or from a client, and its kind. */
export interface ViewToValidate {
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly type: DatabaseViewType;
}

export interface SchemaViewDefinition {
  /** Set on a view read from storage. A view that is new has none; one that keeps its id keeps its manual order. */
  readonly id?: string | undefined;
  /** Rises with every operation on the view; the client compares it to know its copy is stale. */
  readonly version?: number | undefined;
  readonly name: string;
  readonly type: DatabaseViewType;
  readonly configuration: JsonObject;
  readonly isDefault: boolean;
}

/** The option is named by its id. A `to` of `null` removes it. */
export interface SchemaOptionRename {
  readonly optionId: string;
  readonly propertyKey: string;
  readonly to: null | string;
}

export interface SchemaOrderedRow {
  readonly id: string;
  readonly order: number;
}

export interface SchemaGroupableRow extends SchemaOrderedRow {
  readonly propertyValues: SchemaPropertyValues;
}

export interface SchemaRowGroup<TRow extends SchemaGroupableRow> {
  readonly color: PageOptionColor | null;
  readonly key: string;
  readonly label: string;
  readonly rows: readonly TRow[];
}

export interface SchemaRowBand<TRow extends SchemaGroupableRow> {
  readonly color: PageOptionColor | null;
  readonly groups: readonly SchemaRowGroup<TRow>[];
  readonly key: string;
  readonly label: string;
}
