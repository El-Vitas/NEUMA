import {
  DEADLOCK_DETECTED_SQL_STATE,
  SERIALIZATION_FAILURE_SQL_STATE,
  UNIQUE_VIOLATION_SQL_STATE,
} from './constants/database.constants.js';

const readSqlState = (error: unknown): unknown =>
  typeof error === 'object' && error !== null && 'sqlState' in error ? error.sqlState : undefined;

// A conflict found at commit arrives wrapped, with the database error as its cause.
export const isUniqueViolation = (error: unknown): boolean => {
  const cause = error instanceof Error ? error.cause : undefined;
  return readSqlState(error) === UNIQUE_VIOLATION_SQL_STATE || readSqlState(cause) === UNIQUE_VIOLATION_SQL_STATE;
};

const isRetryableSqlState = (sqlState: unknown): boolean =>
  sqlState === DEADLOCK_DETECTED_SQL_STATE || sqlState === SERIALIZATION_FAILURE_SQL_STATE;

/** A deadlock or a serialization failure: Postgres rolled the transaction back, and running it again can succeed. */
export const isRetryableTransactionFailure = (error: unknown): boolean => {
  const cause = error instanceof Error ? error.cause : undefined;
  return isRetryableSqlState(readSqlState(error)) || isRetryableSqlState(readSqlState(cause));
};
