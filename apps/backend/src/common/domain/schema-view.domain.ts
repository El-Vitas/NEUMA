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

/** A marker such as "me" or "@this_week" that the filter of the view carries but means nothing on its property. */
const findInvalidViewFilterToken = (
  view: ViewToValidate,
  properties: readonly SchemaPropertyDefinition[],
): string | null => {
  const { filter } = readPageViewConfiguration(view.configuration);
  return filter === null ? null : findInvalidPageFilterToken(filter, properties);
};

export const validateSchemaView = <TView extends ViewToValidate>(
  view: TView,
  properties: readonly SchemaPropertyDefinition[],
): Result<TView, SchemaViewValidationError> => {
  if (!pageViewConfigurationSchema.safeParse(view.configuration).success) {
    return Result.fail(new SchemaViewValidationError('View configuration is not valid'));
  }
  const invalidToken = findInvalidViewFilterToken(view, properties);
  if (invalidToken !== null) return Result.fail(new SchemaViewValidationError(invalidToken));
  const groupBy = view.configuration.groupBy;
  // A view that must group needs a valid property; one that may skip grouping is valid only if it skips it entirely.
  if (!pageViewRequiresGrouping(view.type) && (groupBy === undefined || groupBy === null)) return Result.ok(view);
  const property = properties.find((candidate) => candidate.key === groupBy);
  return property !== undefined && canPagePropertyGroupBoard(property.type)
    ? Result.ok(view)
    : Result.fail(new SchemaViewValidationError('groupBy must reference a property that can make groups'));
};
