import type { PagePropertyContext, PagePropertyType } from '@company-brain/shared';
import {
  formatPagePropertyValue,
  getDefaultPagePropertyValue,
  getPagePropertyLogicalType,
  isPagePropertyValueEmpty,
  isTitlePageProperty,
  PAGE_PROPERTY_LOGICAL_TYPE,
  pagePropertyRequiresPersonDirectory,
} from '@company-brain/shared';
import type {
  PagePersonOption,
  PagePropertyValue,
  PagePropertyValues,
  PageSchema,
  PageSchemaProperty,
} from '../types/pages.schema.types';

const toPropertyContext = (property: PageSchemaProperty): PagePropertyContext => ({
  options: property.options?.map((option) => option.value) ?? null,
  personIds: undefined,
});

/**
 * Cómo se llama una propiedad, o su clave cuando ya no está.
 *
 * Una vista puede nombrar una propiedad que la colección dejó de tener, y decir
 * la clave es decir algo con lo que se puede ir a buscar; callar deja un hueco
 * que no lleva a ninguna parte.
 */
export const readPropertyLabel = (properties: readonly PageSchemaProperty[], key: string): string =>
  properties.find((property) => property.key === key)?.label ?? key;

export const getEditableSchemaProperties = (schema: PageSchema | null): readonly PageSchemaProperty[] =>
  schema === null ? [] : schema.properties.filter((property) => !isTitlePageProperty(property.type));

export const getDefaultPropertyValue = (property: PageSchemaProperty): PagePropertyValue =>
  getDefaultPagePropertyValue(property.type, toPropertyContext(property));

export const buildDefaultPropertyValues = (properties: readonly PageSchemaProperty[]): PagePropertyValues =>
  Object.fromEntries(properties.map((property) => [property.key, getDefaultPropertyValue(property)]));

/**
 * The defaults a row can be made with, leaving out what would be no answer.
 *
 * A collection may require an answer for every row, and it may also hold
 * properties nobody can guess — who it is for, when it is due. Sending an empty
 * one is worse than sending none: the collection reads it as an answer and
 * refuses it, and whoever pressed the button is told nothing they can act on.
 */
export const buildRowPropertyValues = (properties: readonly PageSchemaProperty[]): PagePropertyValues =>
  Object.fromEntries(
    properties
      .map((property) => [property, getDefaultPropertyValue(property)] as const)
      .filter(([property, value]) => !isPagePropertyValueEmpty(property.type, value))
      .map(([property, value]) => [property.key, value]),
  );

export const getStringPropertyValue = (value: PagePropertyValue | undefined): string =>
  typeof value === 'string' ? value : '';

export const getNumberPropertyValue = (value: PagePropertyValue | undefined): number =>
  typeof value === 'number' ? value : 0;

export const getBooleanPropertyValue = (value: PagePropertyValue | undefined): boolean =>
  typeof value === 'boolean' && value;

export const getMultiSelectPropertyValue = (value: PagePropertyValue | undefined): readonly string[] =>
  Array.isArray(value) ? value : [];

export const formatPropertyValueForDisplay = (
  property: PageSchemaProperty,
  value: PagePropertyValue | undefined,
): string => formatPagePropertyValue(property.type, value);

/** Whether a row answered a property at all, which is what decides if it takes room on a card. */
export const hasPropertyValueToShow = (value: PagePropertyValue | undefined): boolean =>
  value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0);

export const hasPersonProperty = (properties: readonly PageSchemaProperty[]): boolean =>
  properties.some((property) => pagePropertyRequiresPersonDirectory(property.type));

export const schemaNeedsPersonOptions = (schema: PageSchema | null): boolean =>
  hasPersonProperty(getEditableSchemaProperties(schema));

export const findPagePersonOption = (
  options: readonly PagePersonOption[],
  personId: string,
): PagePersonOption | undefined => options.find((option) => option.id === personId);

export const getPagePersonOptionLabel = (options: readonly PagePersonOption[], option: PagePersonOption): string => {
  const hasNameCollision = options.filter((candidate) => candidate.name === option.name).length > 1;
  return hasNameCollision ? `${option.name} (${option.email})` : option.name;
};

/**
 * Cómo se lee una asignación allí donde solo se muestra: el nombre de quien
 * está asignado, nunca su identificador.
 *
 * Devuelve `null` cuando hay alguien asignado a quien el directorio ya no
 * reconoce, para que quien lo muestre lo diga con palabras en vez de enseñar
 * un identificador desnudo. Mientras el directorio no haya llegado no dice
 * nada, por la misma razón.
 */
export const readPagePersonDisplayName = (
  options: readonly PagePersonOption[],
  value: PagePropertyValue | undefined,
): string | null => {
  if (typeof value !== 'string' || value === '') return '';
  if (options.length === 0) return '';
  const person = findPagePersonOption(options, value);
  return person === undefined ? null : getPagePersonOptionLabel(options, person);
};

/**
 * Cuándo lo respondido en una celda ya está dicho del todo.
 *
 * Lo que se elige de una lista o se marca queda respondido en el mismo gesto:
 * no hay un después. Lo que se escribe —un texto, un número, una fecha— pasa
 * por estados a medio escribir que no son la respuesta, así que se guarda al
 * salir del campo y no en cada tecla.
 */
export const pagePropertyAnswersOnPick = (type: PagePropertyType): boolean => {
  const logicalType = getPagePropertyLogicalType(type);
  return (
    logicalType === PAGE_PROPERTY_LOGICAL_TYPE.TAG ||
    logicalType === PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG ||
    logicalType === PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN
  );
};

/** Which word a checkbox is read as, so the cell that shows it asks one question and not two. */
export const readCheckboxLabelKey = (value: PagePropertyValue | undefined): string =>
  getBooleanPropertyValue(value) ? 'properties.yes' : 'properties.no';
