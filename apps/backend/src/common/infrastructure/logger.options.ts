import type { IncomingMessage, ServerResponse } from 'node:http';
import { formatChileanTime } from '@neuma/shared';
import { type LoggerOptions, stdSerializers } from 'pino';
import { LOG_REDACTED_FIELDS } from '../constants/logger.constants';
import { readPathWithoutQuery } from '../utils/request-path.utils';

/** Logs only message and stack, never the whole error object, which can carry data. */
const writeLoggedError = (object: Record<string, unknown>): Record<string, unknown> => {
  if (object.err === undefined) return object;
  const errValue = object.err;
  if (errValue instanceof Error) return { ...object, err: { message: errValue.message, stack: errValue.stack } };
  if (typeof errValue === 'string') return { ...object, err: { message: errValue } };
  return { ...object, err: { message: '[non-string error]' } };
};

const readTopAndNested = (field: string): readonly string[] => [field, `*.${field}`];

/** Shared by every backend process (HTTP server and MCP) so the same error logs identically. */
export const buildLogOptions = (level: string): LoggerOptions => ({
  formatters: {
    level: (label: string) => ({ level: label.toUpperCase() }),
    log: writeLoggedError,
  },
  level,
  redact: {
    censor: '[REDACTED]',
    paths: ['req.headers.authorization', 'req.headers.cookie', ...LOG_REDACTED_FIELDS.flatMap(readTopAndNested)],
  },
  serializers: {
    err: stdSerializers.err,
    req: (req: IncomingMessage) => ({ method: req.method, url: readPathWithoutQuery(req.url) }),
    res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
  },
  timestamp: formatChileanTime,
});
