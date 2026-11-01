import { DatabasePropertyType } from '@neuma/db';

export const MULTI_VALUE_TYPES: readonly DatabasePropertyType[] = [
  DatabasePropertyType.MULTI_SELECT,
  DatabasePropertyType.PERSON,
];

export const CHECKBOX_KEYS = ['true', 'false'] as const;
