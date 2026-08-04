import { Client } from 'pg';

const redactCredentials = (connectionUrl: string): string => {
  const url = new URL(connectionUrl);
  url.password = '';
  url.username = '';
  return url.toString();
};

const NETWORK_UNREACHABLE_ERROR_CODES = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH']);
const SERVER_REJECTED_ERROR_CODES = new Set(['3D000', '28P01', '28000']);

const readErrorCode = (error: unknown): string =>
  error instanceof Error && 'code' in error ? String((error as { code: unknown }).code) : '';

const isNetworkUnreachableError = (error: unknown): boolean =>
  (error instanceof Error && /timeout expired/i.test(error.message)) ||
  NETWORK_UNREACHABLE_ERROR_CODES.has(readErrorCode(error));

const isServerRejectedError = (error: unknown): boolean => SERVER_REJECTED_ERROR_CODES.has(readErrorCode(error));

const buildUnreachableMessage = (redactedUrl: string, timeoutMs: number): string =>
  `PostgreSQL does not appear to be running or reachable at ${redactedUrl} within ${String(timeoutMs)}ms. ` +
  'Start it with: docker compose --env-file .env.docker.example up -d postgres.';

const buildRejectedMessage = (redactedUrl: string): string =>
  `PostgreSQL is running and reachable at ${redactedUrl}, but rejected the connection — the database, role, or ` +
  'credentials are wrong. Check TEST_DATABASE_URL/TEST_DATABASE_ADMIN_URL in .env.test against the actual ' +
  'database name and role; the server itself does not need to be restarted.';

const buildUnexpectedMessage = (redactedUrl: string, timeoutMs: number): string =>
  `Could not connect to PostgreSQL at ${redactedUrl} within ${String(timeoutMs)}ms for an unexpected reason.`;

const buildDiagnosticMessage = (error: unknown, redactedUrl: string, timeoutMs: number): string => {
  if (isNetworkUnreachableError(error)) return buildUnreachableMessage(redactedUrl, timeoutMs);
  if (isServerRejectedError(error)) return buildRejectedMessage(redactedUrl);
  return buildUnexpectedMessage(redactedUrl, timeoutMs);
};

export const assertDatabaseReachable = async (connectionUrl: string, timeoutMs: number): Promise<void> => {
  const client = new Client({ connectionString: connectionUrl, connectionTimeoutMillis: timeoutMs });
  try {
    await client.connect();
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown connection error';
    const message = buildDiagnosticMessage(error, redactCredentials(connectionUrl), timeoutMs);
    throw new Error(`${message} Original error: ${reason}`);
  } finally {
    await client.end().catch(() => undefined);
  }
};

export const withBoundedTimeout = async <TResult>(
  operation: Promise<TResult>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<TResult> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
};
