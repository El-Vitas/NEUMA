import { DatabasePropertyType } from '@neuma/db';
import type { PagePropertyOption, PagePropertyOptionDraft } from '@neuma/shared';
import { assignPageOptionIds, createDefaultStatusOptions, pagePropertyRequiresOptions, Result } from '@neuma/shared';
import type {
  SchemaPropertyDefinition,
  SchemaPropertyValues,
  SchemaValuesCheck,
  SchemaViewDefinition,
} from '../../../common/domain/schema.domain.types';
import {
  fillStatusDefaults,
  keepWhatTheSchemaKnows,
  mergePropertyValues,
  validateSchemaProperties,
  validateSchemaPropertyValues,
} from '../../../common/domain/schema-property.domain';
import { validateSchemaView } from '../../../common/domain/schema-view.domain';
import { PagePropertyValidationError, PageSchemaDefinitionError } from './page.error';
import type { SchemaPropertyDraft } from './page-schema.domain.types';

export const pageCarriesSchema = (schemaProperties: readonly SchemaPropertyDefinition[]): boolean =>
  schemaProperties.length > 0;

const toOptions = (
  draft: SchemaPropertyDraft,
  stored: SchemaPropertyDefinition | undefined,
  generate: () => string,
): readonly PagePropertyOption[] | null => {
  const drafts: readonly PagePropertyOptionDraft[] = draft.options ?? [];
  if (!pagePropertyRequiresOptions(draft.type) && drafts.length === 0) return null;
  if (draft.type === DatabasePropertyType.STATUS && drafts.length === 0) {
    return stored?.options?.length ? stored.options : createDefaultStatusOptions(generate);
  }
  return assignPageOptionIds(drafts, stored?.options ?? [], generate);
};

/**
 * What a caller sends becomes definitions: an option that is new gets the id of the server, one that exists keeps its
 * own, and a new status starts with an option in each group.
 */
export const resolveSchemaDrafts = (
  drafts: readonly SchemaPropertyDraft[],
  stored: readonly SchemaPropertyDefinition[],
  generate: () => string,
): readonly SchemaPropertyDefinition[] =>
  drafts.map(({ computedDraft: _computedDraft, twoWay: _twoWay, ...draft }) => ({
    ...draft,
    options: toOptions(
      { ...draft, twoWay: false },
      stored.find((property) => property.key === draft.key),
      generate,
    ),
  }));

export const validatePageSchemaDefinition = (
  properties: readonly SchemaPropertyDefinition[],
): Result<readonly SchemaPropertyDefinition[], PageSchemaDefinitionError> => {
  const result = validateSchemaProperties(properties);
  return result.isFail()
    ? Result.fail(new PageSchemaDefinitionError(result.getError().message))
    : Result.ok(properties);
};

export const validatePageSchemaView = (
  view: SchemaViewDefinition,
  properties: readonly SchemaPropertyDefinition[],
): Result<SchemaViewDefinition, PageSchemaDefinitionError> => {
  const result = validateSchemaView(view, properties);
  return result.isFail() ? Result.fail(new PageSchemaDefinitionError(result.getError().message)) : Result.ok(view);
};

export const validatePageSchemaViews = (
  views: readonly SchemaViewDefinition[],
  properties: readonly SchemaPropertyDefinition[],
): Result<readonly SchemaViewDefinition[], PageSchemaDefinitionError> => {
  const names = new Set<string>();
  for (const view of views) {
    if (names.has(view.name)) return Result.fail(new PageSchemaDefinitionError(`Duplicate view ${view.name}`));
    names.add(view.name);
    const result = validatePageSchemaView(view, properties);
    if (result.isFail()) return Result.fail(result.getError());
  }
  return Result.ok(views);
};

const findTitleProperty = (
  schemaProperties: readonly SchemaPropertyDefinition[],
): SchemaPropertyDefinition | undefined =>
  schemaProperties.find((property) => property.type === DatabasePropertyType.TITLE);

const hasPropertyValues = (propertyValues: Readonly<Record<string, unknown>> | null): boolean =>
  propertyValues !== null && Object.keys(propertyValues).length > 0;

const stripTitleValue = (values: SchemaPropertyValues, titleKey: string): SchemaPropertyValues =>
  Object.fromEntries(Object.entries(values).filter(([key]) => key !== titleKey));

const validateRowPropertyValues = (
  schemaProperties: readonly SchemaPropertyDefinition[],
  title: string,
  propertyValues: Readonly<Record<string, unknown>>,
  check: SchemaValuesCheck,
): Result<SchemaPropertyValues, PagePropertyValidationError> => {
  const titleProperty = findTitleProperty(schemaProperties);
  if (titleProperty === undefined) {
    return Result.fail(new PagePropertyValidationError('Schema is missing a TITLE property'));
  }
  if (Object.hasOwn(propertyValues, titleProperty.key)) {
    return Result.fail(new PagePropertyValidationError(`${titleProperty.key} must be set through the page title`));
  }
  const combinedValues = { ...propertyValues, [titleProperty.key]: title };
  const validated = validateSchemaPropertyValues(schemaProperties, combinedValues, check);
  return validated.isFail()
    ? Result.fail(new PagePropertyValidationError(validated.getError().message))
    : Result.ok(stripTitleValue(validated.getValue(), titleProperty.key));
};

/** A relation changes one row at a time, so two people editing the same cell never overwrite each other. */
export const checkValuesAreWritableHere = (
  schemaProperties: readonly SchemaPropertyDefinition[],
  propertyValues: Readonly<Record<string, unknown>>,
): Result<void, PagePropertyValidationError> => {
  const relation = schemaProperties.find(
    (property) => property.type === DatabasePropertyType.RELATION && Object.hasOwn(propertyValues, property.key),
  );
  return relation === undefined
    ? Result.ok(undefined)
    : Result.fail(new PagePropertyValidationError(`${relation.key} is a relation: add or remove its rows one by one`));
};

/** The files a write attaches to a row, so their existence and ownership can be checked before the write. */
export const listFileIds = (
  schemaProperties: readonly SchemaPropertyDefinition[],
  propertyValues: Readonly<Record<string, unknown>>,
): readonly string[] => [
  ...new Set(
    schemaProperties
      .filter((property) => property.type === DatabasePropertyType.FILES)
      .flatMap((property) => {
        const cell = propertyValues[property.key];
        return Array.isArray(cell) ? cell.filter((entry): entry is string => typeof entry === 'string') : [];
      }),
  ),
];

export const keepWhatThePageSchemaKnows = keepWhatTheSchemaKnows;
export const mergePagePropertyValues = mergePropertyValues;

/**
 * A row created in a collection is checked against all of it and starts on the default of each status. A row that
 * is edited names the keys written (`check.written`): only those are asked to be filled, so a property made
 * required later does not lock an old row.
 */
export const validatePageProperties = (
  schemaProperties: readonly SchemaPropertyDefinition[],
  title: string,
  propertyValues: Readonly<Record<string, unknown>> | null,
  check: SchemaValuesCheck = {},
): Result<SchemaPropertyValues | null, PagePropertyValidationError> => {
  if (!pageCarriesSchema(schemaProperties)) {
    return hasPropertyValues(propertyValues)
      ? Result.fail(
          new PagePropertyValidationError('Page has no schema-carrying parent and cannot store property values'),
        )
      : Result.ok(null);
  }
  const isCreation = check.written === undefined;
  const values = isCreation ? fillStatusDefaults(schemaProperties, propertyValues ?? {}) : (propertyValues ?? {});
  return validateRowPropertyValues(schemaProperties, title, values, check);
};
