import { DatabasePropertyType } from '@neuma/db';
import type { PagePropertyOption } from '@neuma/shared';
import { findPageOption, hasEveryStatusGroupAnOption, pagePropertyRequiresOptions, Result } from '@neuma/shared';
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
  if (to === null) return { ...property, options: options.filter((option) => option.id !== rename.optionId) };
  return {
    ...property,
    options: options.map((option) => (option.id === rename.optionId ? { ...option, value: to } : option)),
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
  return findPageOption(options, rename.optionId) === null
    ? new SchemaPropertyDefinitionError(`Unknown option ${rename.optionId}`)
    : options;
};

const whatIsWrongWithTheName = (options: readonly PagePropertyOption[], rename: SchemaOptionRename): null | string => {
  if (rename.to === null) return null;
  if (rename.to.trim().length === 0) return 'An option needs a name';
  return options.some((option) => option.value === rename.to && option.id !== rename.optionId)
    ? `Option ${rename.to} already exists`
    : null;
};

/** A status keeps an option in each of its groups: that is what lets a row always have a place to go. */
const whatIsWrongWithTheRemoval = (
  property: SchemaPropertyDefinition | undefined,
  rename: SchemaOptionRename,
): null | string => {
  if (rename.to !== null || property?.type !== DatabasePropertyType.STATUS) return null;
  const remaining = (property.options ?? []).filter((option) => option.id !== rename.optionId);
  return hasEveryStatusGroupAnOption(remaining) ? null : 'A status keeps at least one option in each group';
};

/**
 * Renames or removes an option in place, keeping its id, position and color. The new name must not collide with
 * another option. A rename moves no row, because rows hold the id; a removal must also be applied to the rows.
 */
export const rewriteSchemaOption = (
  properties: readonly SchemaPropertyDefinition[],
  rename: SchemaOptionRename,
): Result<readonly SchemaPropertyDefinition[], SchemaPropertyDefinitionError> => {
  const options = findOptionsToRewrite(properties, rename);
  if (options instanceof SchemaPropertyDefinitionError) return Result.fail(options);
  const wrongName = whatIsWrongWithTheName(options, rename);
  if (wrongName !== null) return refuse(wrongName);
  const wrongRemoval = whatIsWrongWithTheRemoval(
    properties.find((candidate) => candidate.key === rename.propertyKey),
    rename,
  );
  if (wrongRemoval !== null) return refuse(wrongRemoval);
  return Result.ok(
    properties.map((candidate) =>
      candidate.key === rename.propertyKey ? withRewrittenOption(candidate, rename) : candidate,
    ),
  );
};

/** Where the rows of a removed option go: a status keeps them in the same group, a selection just empties them. */
export const findOptionReplacement = (property: SchemaPropertyDefinition, optionId: string): null | string => {
  if (property.type !== DatabasePropertyType.STATUS) return null;
  const removed = findPageOption(property.options, optionId);
  if (removed === null) return null;
  const sibling = (property.options ?? []).find((option) => option.group === removed.group && option.id !== optionId);
  return sibling?.id ?? null;
};

export const propertyValueMentions = (value: SchemaPropertyValue | undefined, optionId: string): boolean =>
  isStringArray(value) ? value.includes(optionId) : value === optionId;

/** With no replacement, only the removed option is dropped from the row. */
export const rewritePropertyValue = (
  value: SchemaPropertyValue | undefined,
  optionId: string,
  replacementId: null | string,
): SchemaPropertyValue | undefined => {
  if (isStringArray(value)) {
    return replacementId === null
      ? value.filter((entry) => entry !== optionId)
      : value.map((entry) => (entry === optionId ? replacementId : entry));
  }
  if (value !== optionId) return value;
  return replacementId ?? undefined;
};

/** A property left without a value is removed rather than stored empty: absent means the row is in no column. */
export const rewritePropertyValues = (
  stored: SchemaPropertyValues,
  propertyKey: string,
  optionId: string,
  replacementId: null | string,
): SchemaPropertyValues => {
  const { [propertyKey]: replaced, ...rest } = stored;
  const written = rewritePropertyValue(replaced, optionId, replacementId);
  return written === undefined ? rest : { ...rest, [propertyKey]: written };
};
