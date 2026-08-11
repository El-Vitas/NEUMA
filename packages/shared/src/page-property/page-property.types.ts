import type { PagePropertyType } from '../types/page-schema.types.js';

export type PagePropertyValue = string | number | boolean | readonly string[];

export type PagePropertyValues = Readonly<Record<string, PagePropertyValue>>;

export type PagePropertyLogicalType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'TAG' | 'MULTI_TAG';

export const PAGE_PROPERTY_LOGICAL_TYPE = {
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  DATE: 'DATE',
  TAG: 'TAG',
  MULTI_TAG: 'MULTI_TAG',
} as const satisfies Record<PagePropertyLogicalType, PagePropertyLogicalType>;

export interface PagePropertyContext {
  readonly options: readonly string[] | null;
  readonly personIds: ReadonlySet<string> | undefined;
}

export interface PagePropertyCapabilities {
  readonly isTitle: boolean;
  readonly requiresOptions: boolean;
  readonly requiresPersonDirectory: boolean;
  readonly canGroupBoard: boolean;
}

export interface PagePropertyDefinition {
  readonly type: PagePropertyType;
  readonly logicalType: PagePropertyLogicalType;
  readonly capabilities: PagePropertyCapabilities;
  readonly getDefaultValue: (context: PagePropertyContext) => PagePropertyValue;
  readonly isValidValue: (value: PagePropertyValue, context: PagePropertyContext) => boolean;
  readonly isEmptyValue: (value: PagePropertyValue) => boolean;
  readonly toDisplayString: (value: PagePropertyValue) => string;
}
