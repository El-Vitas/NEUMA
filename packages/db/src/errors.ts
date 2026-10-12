import { UNIQUE_VIOLATION_SQL_STATE } from './constants/database.constants.js';

const readSqlState = (error: unknown): unknown =>
  typeof error === 'object' && error !== null && 'sqlState' in error ? error.sqlState : undefined;

// A conflict found at commit arrives wrapped, with the database error as its cause.
export const isUniqueViolation = (error: unknown): boolean => {
  const cause = error instanceof Error ? error.cause : undefined;
  return readSqlState(error) === UNIQUE_VIOLATION_SQL_STATE || readSqlState(cause) === UNIQUE_VIOLATION_SQL_STATE;
};
