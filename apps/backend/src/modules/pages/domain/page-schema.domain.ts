import { DatabasePropertyType } from '@company-brain/db';
import { Result } from '@company-brain/shared';
import type {
  SchemaPropertyDefinition,
  SchemaPropertyValues,
  SchemaViewDefinition,
} from '../../../common/domain/schema.domain.types';
import { validateSchemaProperties, validateSchemaPropertyValues } from '../../../common/domain/schema-property.domain';
import { validateSchemaView } from '../../../common/domain/schema-view.domain';
import { PagePropertyValidationError, PageSchemaDefinitionError } from './page.error';

export const pageCarriesSchema = (schemaProperties: readonly SchemaPropertyDefinition[]): boolean =>
  schemaProperties.length > 0;

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
  personIds: ReadonlySet<string> | undefined,
): Result<SchemaPropertyValues, PagePropertyValidationError> => {
  const titleProperty = findTitleProperty(schemaProperties);
  if (titleProperty === undefined) {
    return Result.fail(new PagePropertyValidationError('Schema is missing a TITLE property'));
  }
  if (Object.hasOwn(propertyValues, titleProperty.key)) {
    return Result.fail(new PagePropertyValidationError(`${titleProperty.key} must be set through the page title`));
  }
  const combinedValues = { ...propertyValues, [titleProperty.key]: title };
  const validated = validateSchemaPropertyValues(schemaProperties, combinedValues, personIds);
  return validated.isFail()
    ? Result.fail(new PagePropertyValidationError(validated.getError().message))
    : Result.ok(stripTitleValue(validated.getValue(), titleProperty.key));
};

export const validatePageProperties = (
  schemaProperties: readonly SchemaPropertyDefinition[],
  title: string,
  propertyValues: Readonly<Record<string, unknown>> | null,
  personIds?: ReadonlySet<string>,
): Result<SchemaPropertyValues | null, PagePropertyValidationError> => {
  if (!pageCarriesSchema(schemaProperties)) {
    return hasPropertyValues(propertyValues)
      ? Result.fail(
          new PagePropertyValidationError('Page has no schema-carrying parent and cannot store property values'),
        )
      : Result.ok(null);
  }
  return validateRowPropertyValues(schemaProperties, title, propertyValues ?? {}, personIds);
};
