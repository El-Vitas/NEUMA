import { PAGE_PROPERTY_TYPE } from '@neuma/shared';
import type { PageSchemaProperty } from '../types/pages.schema.types';

export const listNumberPropertyKeys = (properties: readonly PageSchemaProperty[]): readonly string[] =>
  properties.filter((property) => property.type === PAGE_PROPERTY_TYPE.NUMBER).map((property) => property.key);
