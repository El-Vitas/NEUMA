import { pageCoverValueSchema, pageIconSchema, Result, readStoredPageContent } from '@neuma/shared';
import { BLOCK_MIGRATION_PROBLEM } from '../constants/block.migration.constants';
import { findTagLikeToggleSummaries } from '../domain/block.migration.scan.domain';
import { migrationPropertyValuesSchema } from '../schemas/block.migration.schemas';
import type { BlockMigrationProblem, MigrationPage, MigrationPageRow } from '../types/block.migration.types';

const describeInvalidColumn = (pageId: string, column: string): BlockMigrationProblem => ({
  blockId: null,
  kind: BLOCK_MIGRATION_PROBLEM.conversionFailed,
  message: `The ${column} of the page ${pageId} is not valid`,
  pageId,
});

const readOptional = <Value>(
  stored: unknown,
  parse: (candidate: unknown) => { data?: Value; success: boolean },
): Result<Value | null, null> => {
  if (stored === null || stored === undefined) return Result.ok(null);
  const parsed = parse(stored);
  return parsed.success && parsed.data !== undefined ? Result.ok(parsed.data) : Result.fail(null);
};

/**
 * Checks the JSON columns of a stored page. The document goes through the same reader the app uses, so a page saved
 * at an older schema version is brought up to date first; one that cannot be read stops the migration.
 */
export const readMigrationPage = (row: MigrationPageRow): Result<MigrationPage, BlockMigrationProblem> => {
  const content = readStoredPageContent(row.content);
  if (content === null) return Result.fail(describeInvalidColumn(row.id, 'document'));
  const icon = readOptional(row.icon, (candidate) => pageIconSchema.safeParse(candidate));
  if (icon.isFail()) return Result.fail(describeInvalidColumn(row.id, 'icon'));
  const cover = readOptional(row.cover, (candidate) => pageCoverValueSchema.safeParse(candidate));
  if (cover.isFail()) return Result.fail(describeInvalidColumn(row.id, 'cover'));
  const propertyValues = readOptional(row.propertyValues, (candidate) =>
    migrationPropertyValuesSchema.safeParse(candidate),
  );
  if (propertyValues.isFail()) return Result.fail(describeInvalidColumn(row.id, 'property values'));
  return Result.ok({
    ...row,
    content,
    cover: cover.getValue(),
    icon: icon.getValue(),
    propertyValues: propertyValues.getValue(),
  });
};

/** Reads a stored page and stops at the case the migration lists before it converts anything. */
export const readCheckedPage = (row: MigrationPageRow): Result<MigrationPage, readonly BlockMigrationProblem[]> => {
  const page = readMigrationPage(row);
  if (page.isFail()) return Result.fail([page.getError()]);
  const tagProblems = findTagLikeToggleSummaries(row.id, page.getValue().content);
  return tagProblems.length === 0 ? Result.ok(page.getValue()) : Result.fail(tagProblems);
};
