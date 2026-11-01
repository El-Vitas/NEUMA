import { DatabasePropertyType } from '@neuma/db';
import type { PageDateBucket, PageGroupByMode, PagePropertyOption } from '@neuma/shared';
import {
  canPagePropertyGroupBoard,
  PAGE_GROUP_BY_MODE,
  PAGE_STATUS_GROUP_VALUES,
  Result,
  sortPageOptionsByGroup,
} from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';
import { PageQueryInvalidError } from './page-query.error';
import { CHECKBOX_KEYS, MULTI_VALUE_TYPES } from './page-query.grouping.constants';
import type { GroupingPlan } from './page-query.grouping.domain.types';

const statusGroupByOption = (options: readonly PagePropertyOption[]): Readonly<Record<string, string>> =>
  Object.fromEntries(options.flatMap((option) => (option.group === null ? [] : [[option.id, option.group]])));

const declaredKeysOf = (property: SchemaPropertyDefinition, mode: PageGroupByMode): readonly string[] | null => {
  if (property.type === DatabasePropertyType.CHECKBOX) return CHECKBOX_KEYS;
  if (property.type === DatabasePropertyType.STATUS) {
    return mode === PAGE_GROUP_BY_MODE.GROUP
      ? PAGE_STATUS_GROUP_VALUES
      : sortPageOptionsByGroup(property.options ?? []).map((option) => option.id);
  }
  return property.options === null ? null : property.options.map((option) => option.id);
};

export const resolveGrouping = (
  properties: ReadonlyMap<string, SchemaPropertyDefinition>,
  propertyKey: string,
  mode: PageGroupByMode,
  bucket: PageDateBucket,
): Result<GroupingPlan, PageQueryInvalidError> => {
  const property = properties.get(propertyKey);
  if (property === undefined || !canPagePropertyGroupBoard(property.type)) {
    return Result.fail(new PageQueryInvalidError(`The property ${propertyKey} cannot make groups`));
  }
  const isStatus = property.type === DatabasePropertyType.STATUS;
  return Result.ok({
    bucket,
    declaredKeys: declaredKeysOf(property, mode),
    hasUnassignedGroup: !isStatus,
    isMultiValue: MULTI_VALUE_TYPES.includes(property.type),
    mode: isStatus ? mode : PAGE_GROUP_BY_MODE.OPTION,
    property,
    statusGroupByOption:
      isStatus && mode === PAGE_GROUP_BY_MODE.GROUP ? statusGroupByOption(property.options ?? []) : null,
  });
};
