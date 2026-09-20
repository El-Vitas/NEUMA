import { PAGE_PROPERTY_TYPE } from '@company-brain/shared';
import type { PageSchemaProperty } from '../types/pages.schema.types';

/** Las propiedades que un gráfico puede sumar o promediar: las que responden con un número. */
export const listNumberPropertyKeys = (properties: readonly PageSchemaProperty[]): readonly string[] =>
  properties.filter((property) => property.type === PAGE_PROPERTY_TYPE.NUMBER).map((property) => property.key);
