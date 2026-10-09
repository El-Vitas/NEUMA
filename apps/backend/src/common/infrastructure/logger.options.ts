import type { IncomingMessage, ServerResponse } from 'node:http';
import { formatChileanTime } from '@company-brain/shared';
import { type LoggerOptions, stdSerializers } from 'pino';
import { LOG_REDACTED_FIELDS } from '../constants/logger.constants';

/** Un error como se escribe en el log: su mensaje y su traza, nunca el objeto entero, que puede cargar datos. */
const writeLoggedError = (object: Record<string, unknown>): Record<string, unknown> => {
  if (object.err === undefined) return object;
  const errValue = object.err;
  if (errValue instanceof Error) return { ...object, err: { message: errValue.message, stack: errValue.stack } };
  if (typeof errValue === 'string') return { ...object, err: { message: errValue } };
  return { ...object, err: { message: '[non-string error]' } };
};

/** Un campo personal o secreto, arriba de lo que se escribe y dentro de un objeto que va en él. */
const readTopAndNested = (field: string): readonly string[] => [field, `*.${field}`];

/**
 * Cómo escribe el log todo proceso del backend: el servidor HTTP y el MCP por
 * terminal por igual, para que un mismo error se lea igual venga de donde venga.
 * Niveles por nombre en mayúsculas, hora de Chile, errores con su traza y sin
 * datos personales ni secretos.
 */
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
    req: (req: IncomingMessage) => ({ method: req.method, url: req.url }),
    res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
  },
  timestamp: formatChileanTime,
});
