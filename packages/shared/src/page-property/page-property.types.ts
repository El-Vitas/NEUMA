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

/** Named, not numeric, so the same color reads in a tag, a board heading and an export. */
export type PageOptionColor = 'GRAY' | 'BROWN' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'PURPLE' | 'PINK' | 'RED';

export const PAGE_OPTION_COLOR = {
  GRAY: 'GRAY',
  BROWN: 'BROWN',
  ORANGE: 'ORANGE',
  YELLOW: 'YELLOW',
  GREEN: 'GREEN',
  BLUE: 'BLUE',
  PURPLE: 'PURPLE',
  PINK: 'PINK',
  RED: 'RED',
} as const satisfies Record<PageOptionColor, PageOptionColor>;

export const PAGE_OPTION_COLOR_VALUES = [
  PAGE_OPTION_COLOR.GRAY,
  PAGE_OPTION_COLOR.BROWN,
  PAGE_OPTION_COLOR.ORANGE,
  PAGE_OPTION_COLOR.YELLOW,
  PAGE_OPTION_COLOR.GREEN,
  PAGE_OPTION_COLOR.BLUE,
  PAGE_OPTION_COLOR.PURPLE,
  PAGE_OPTION_COLOR.PINK,
  PAGE_OPTION_COLOR.RED,
] as const;

export interface PagePropertyOption {
  readonly color: PageOptionColor | null;
  readonly value: string;
}

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
