import {
  canPagePropertyGroupBoard,
  pageViewConfigurationSchema,
  pageViewRequiresGrouping,
  Result,
} from '@company-brain/shared';
import type { SchemaPropertyDefinition, SchemaViewDefinition } from './schema.domain.types';
import { SchemaViewValidationError } from './schema.error';

export const validateSchemaView = (
  view: SchemaViewDefinition,
  properties: readonly SchemaPropertyDefinition[],
): Result<SchemaViewDefinition, SchemaViewValidationError> => {
  if (!pageViewConfigurationSchema.safeParse(view.configuration).success) {
    return Result.fail(new SchemaViewValidationError('View configuration is not valid'));
  }
  const groupBy = view.configuration.groupBy;
  /**
   * Una vista que tiene que agrupar sin decir por qué no dibuja nada, y una que
   * podía no agrupar pero eligió una propiedad que no sirve tampoco. Lo que sí
   * vale es no agrupar cuando no hacía falta.
   */
  if (!pageViewRequiresGrouping(view.type) && (groupBy === undefined || groupBy === null)) return Result.ok(view);
  const property = properties.find((candidate) => candidate.key === groupBy);
  return property !== undefined && canPagePropertyGroupBoard(property.type)
    ? Result.ok(view)
    : Result.fail(new SchemaViewValidationError('groupBy must reference a property that can make groups'));
};
