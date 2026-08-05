import type { DatabaseViewType } from '@company-brain/db';
import { Result } from '@company-brain/shared';
import { groupRowsByBoard } from '../../../common/domain/schema-view-grouping.domain';
import type { DatabaseBoardColumn, DatabasePropertyDefinition, DatabaseRecordSummary } from './database.domain.types';
import { DatabaseViewValidationError } from './database.error';

export const groupRecordsByBoard = (
  viewType: DatabaseViewType,
  configuration: Readonly<Record<string, unknown>>,
  properties: readonly DatabasePropertyDefinition[],
  records: readonly DatabaseRecordSummary[],
): Result<readonly DatabaseBoardColumn[], DatabaseViewValidationError> => {
  const grouped = groupRowsByBoard(viewType, configuration, properties, records);
  if (grouped.isFail()) return Result.fail(new DatabaseViewValidationError(grouped.getError().message));
  return Result.ok(
    grouped.getValue().map((column) => ({ key: column.key, label: column.label, records: column.rows })),
  );
};
