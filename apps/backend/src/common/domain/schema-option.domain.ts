import type { PagePropertyOption } from '@neuma/shared';
import { pagePropertyRequiresOptions, Result } from '@neuma/shared';
import type {
  SchemaOptionRename,
  SchemaPropertyDefinition,
  SchemaPropertyValue,
  SchemaPropertyValues,
} from './schema.domain.types';
import { SchemaPropertyDefinitionError } from './schema.error';
import { isStringArray } from './schema-property.domain';

const refuse = (details: string) =>
  Result.fail<never, SchemaPropertyDefinitionError>(new SchemaPropertyDefinitionError(details));

const withRewrittenOption = (
  property: SchemaPropertyDefinition,
  rename: SchemaOptionRename,
): SchemaPropertyDefinition => {
  const options = property.options ?? [];
  const { to } = rename;
  if (to === null) return { ...property, options: options.filter((option) => option.value !== rename.from) };
  return {
    ...property,
    options: options.map((option) => (option.value === rename.from ? { ...option, value: to } : option)),
  };
};

const findOptionsToRewrite = (
  properties: readonly SchemaPropertyDefinition[],
  rename: SchemaOptionRename,
): SchemaPropertyDefinitionError | readonly PagePropertyOption[] => {
  const property = properties.find((candidate) => candidate.key === rename.propertyKey);
  if (property === undefined) return new SchemaPropertyDefinitionError(`Unknown property ${rename.propertyKey}`);
  if (!pagePropertyRequiresOptions(property.type)) {
    return new SchemaPropertyDefinitionError(`${rename.propertyKey} has no options`);
  }
  const options = property.options ?? [];
  return options.some((option) => option.value === rename.from)
    ? options
    : new SchemaPropertyDefinitionError(`Unknown option ${rename.from}`);
};

const whatIsWrongWithTheName = (options: readonly PagePropertyOption[], rename: SchemaOptionRename): null | string => {
  if (rename.to === null) return null;
  if (rename.to.trim().length === 0) return 'An option needs a name';
  return options.some((option) => option.value === rename.to && option.value !== rename.from)
    ? `Option ${rename.to} already exists`
    : null;
};

/**
 * Renames or removes an option in place, keeping its position and color. The new
 * name must not collide with another option. Only the schema changes: rows
 * storing the old name must be rewritten in the same operation.
 */
export const rewriteSchemaOption = (
  properties: readonly SchemaPropertyDefinition[],
  rename: SchemaOptionRename,
): Result<readonly SchemaPropertyDefinition[], SchemaPropertyDefinitionError> => {
  const options = findOptionsToRewrite(properties, rename);
  if (options instanceof SchemaPropertyDefinitionError) return Result.fail(options);
  const wrongName = whatIsWrongWithTheName(options, rename);
  if (wrongName !== null) return refuse(wrongName);
  return Result.ok(
    properties.map((candidate) =>
      candidate.key === rename.propertyKey ? withRewrittenOption(candidate, rename) : candidate,
    ),
  );
};

export const propertyValueMentions = (value: SchemaPropertyValue | undefined, name: string): boolean =>
  isStringArray(value) ? value.includes(name) : value === name;

/** With no new name, only the old value is dropped from the row. */
export const rewritePropertyValue = (
  value: SchemaPropertyValue | undefined,
  from: string,
  to: null | string,
): SchemaPropertyValue | undefined => {
  if (isStringArray(value)) {
    return to === null ? value.filter((entry) => entry !== from) : value.map((entry) => (entry === from ? to : entry));
  }
  if (value !== from) return value;
  return to ?? undefined;
};

/** A property left without a value is removed rather than stored empty: absent means the row is in no column. */
export const rewritePropertyValues = (
  stored: SchemaPropertyValues,
  propertyKey: string,
  from: string,
  to: null | string,
): SchemaPropertyValues => {
  const { [propertyKey]: replaced, ...rest } = stored;
  const written = rewritePropertyValue(replaced, from, to);
  return written === undefined ? rest : { ...rest, [propertyKey]: written };
};
