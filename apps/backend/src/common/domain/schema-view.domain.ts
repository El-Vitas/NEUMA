import { DatabasePropertyType } from '@neuma/db';
import {
  canPagePropertyGroupBoard,
  findInvalidPageFilterToken,
  pageViewConfigurationSchema,
  pageViewRequiresGrouping,
  Result,
  readPageViewConfiguration,
} from '@neuma/shared';
import type { SchemaPropertyDefinition, ViewToValidate } from './schema.domain.types';
import { SchemaViewValidationError } from './schema.error';
import { toEffectiveSchemaProperties } from './schema-computed.domain';

/** A marker such as "me" or "@this_week" that the filter of the view carries but means nothing on its property. */
const findInvalidViewFilterToken = (
  view: ViewToValidate,
  properties: readonly SchemaPropertyDefinition[],
): string | null => {
  const { filter } = readPageViewConfiguration(view.configuration);
  return filter === null ? null : findInvalidPageFilterToken(filter, properties);
};

/**
 * A key that names a property of another kind. A key that names none passes: the property may have been deleted, and a
 * view must stay changeable then.
 */
const findWronglyTypedReference = (
  view: ViewToValidate,
  properties: readonly SchemaPropertyDefinition[],
): string | null => {
  const configuration = readPageViewConfiguration(view.configuration);
  const references = [
    { key: 'dateProperty', propertyKey: configuration.dateProperty, type: DatabasePropertyType.DATE },
    { key: 'endDateProperty', propertyKey: configuration.endDateProperty, type: DatabasePropertyType.DATE },
    { key: 'coverProperty', propertyKey: configuration.coverProperty, type: DatabasePropertyType.FILES },
  ];
  const wrong = references.find((reference) => {
    const target = properties.find((property) => property.key === reference.propertyKey);
    return target !== undefined && target.type !== reference.type;
  });
  return wrong === undefined ? null : `${wrong.key} must reference a ${wrong.type.toLowerCase()} property`;
};

export const validateSchemaView = <TView extends ViewToValidate>(
  view: TView,
  schemaProperties: readonly SchemaPropertyDefinition[],
): Result<TView, SchemaViewValidationError> => {
  const properties = toEffectiveSchemaProperties(schemaProperties);
  if (!pageViewConfigurationSchema.safeParse(view.configuration).success) {
    return Result.fail(new SchemaViewValidationError('View configuration is not valid'));
  }
  const invalidToken = findInvalidViewFilterToken(view, properties);
  if (invalidToken !== null) return Result.fail(new SchemaViewValidationError(invalidToken));
  const wrongReference = findWronglyTypedReference(view, properties);
  if (wrongReference !== null) return Result.fail(new SchemaViewValidationError(wrongReference));
  const groupBy = view.configuration.groupBy;
  // A view that must group needs a valid property; one that may skip grouping is valid only if it skips it entirely.
  if (!pageViewRequiresGrouping(view.type) && (groupBy === undefined || groupBy === null)) return Result.ok(view);
  const property = properties.find((candidate) => candidate.key === groupBy);
  return property !== undefined && canPagePropertyGroupBoard(property.type)
    ? Result.ok(view)
    : Result.fail(new SchemaViewValidationError('groupBy must reference a property that can make groups'));
};
