import type { PagePropertyType } from '../types/page-schema.types.js';

/** A single date or a range. `end` is absent for a single date, and never earlier than `start`. */
export interface PageDateValue {
  readonly end?: string;
  readonly start: string;
}

export type PagePropertyValue = string | number | boolean | readonly string[] | PageDateValue;

export type PagePropertyValues = Readonly<Record<string, PagePropertyValue>>;

export type PagePropertyLogicalType =
  | 'TEXT'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATE'
  | 'TAG'
  | 'MULTI_TAG'
  | 'STATUS'
  | 'RELATION'
  | 'FILES';

export const PAGE_PROPERTY_LOGICAL_TYPE = {
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  DATE: 'DATE',
  TAG: 'TAG',
  MULTI_TAG: 'MULTI_TAG',
  STATUS: 'STATUS',
  RELATION: 'RELATION',
  FILES: 'FILES',
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

/** The three fixed groups of a status property, in the order they read from start to finish. */
export type PageStatusGroup = 'TO_DO' | 'IN_PROGRESS' | 'COMPLETE';

export const PAGE_STATUS_GROUP = {
  TO_DO: 'TO_DO',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
} as const satisfies Record<PageStatusGroup, PageStatusGroup>;

export const PAGE_STATUS_GROUP_VALUES = [
  PAGE_STATUS_GROUP.TO_DO,
  PAGE_STATUS_GROUP.IN_PROGRESS,
  PAGE_STATUS_GROUP.COMPLETE,
] as const;

/** `id` is what rows store; `value` is the name people read and may be renamed at any time. */
export interface PagePropertyOption {
  readonly color: PageOptionColor | null;
  /** Only a status option has a group. */
  readonly group: PageStatusGroup | null;
  readonly id: string;
  readonly value: string;
}

/** What a client sends: an option that is new has no id yet, and the server gives it one. */
export interface PagePropertyOptionDraft {
  readonly color: PageOptionColor | null;
  readonly group: PageStatusGroup | null;
  readonly id: string | null;
  readonly value: string;
}

export type PageNumberFormat = 'NUMBER' | 'PERCENT' | 'CURRENCY';

export const PAGE_NUMBER_FORMAT = {
  NUMBER: 'NUMBER',
  PERCENT: 'PERCENT',
  CURRENCY: 'CURRENCY',
} as const satisfies Record<PageNumberFormat, PageNumberFormat>;

export const PAGE_NUMBER_FORMAT_VALUES = [
  PAGE_NUMBER_FORMAT.NUMBER,
  PAGE_NUMBER_FORMAT.PERCENT,
  PAGE_NUMBER_FORMAT.CURRENCY,
] as const;

/** Everything a type needs beyond its options. A field a type does not use keeps its neutral value. */
export interface PagePropertyConfig {
  /** Person: whether a row may name more than one. */
  readonly allowsMultiple: boolean;
  /** Number as currency: an ISO 4217 code. */
  readonly currency: string | null;
  /** Number: the most decimals a value may carry; null leaves them free. */
  readonly decimals: number | null;
  /** Relation: the property of the target collection that mirrors this one; null for a one-way relation. */
  readonly mirrorPropertyKey: string | null;
  readonly numberFormat: PageNumberFormat;
  /** Unique id: shown before the number. */
  readonly prefix: string;
  /** Relation: the collection the rows point to. */
  readonly targetCollectionId: string | null;
}

export interface PagePropertyContext {
  readonly config: PagePropertyConfig;
  readonly options: readonly PagePropertyOption[] | null;
  readonly personIds: ReadonlySet<string> | undefined;
}

export interface PagePropertyCapabilities {
  readonly isTitle: boolean;
  readonly requiresOptions: boolean;
  readonly requiresPersonDirectory: boolean;
  readonly canGroupBoard: boolean;
  /** The server fills it: a client write is refused. */
  readonly isSystemManaged: boolean;
  /** Whether the editor offers "required" for it. */
  readonly canBeRequired: boolean;
}

export interface PagePropertyDefinition {
  readonly type: PagePropertyType;
  readonly logicalType: PagePropertyLogicalType;
  readonly capabilities: PagePropertyCapabilities;
  readonly getDefaultValue: (context: PagePropertyContext) => PagePropertyValue;
  readonly isValidValue: (value: PagePropertyValue, context: PagePropertyContext) => boolean;
  readonly isEmptyValue: (value: PagePropertyValue) => boolean;
  readonly toDisplayString: (value: PagePropertyValue, context: PagePropertyContext) => string;
}
