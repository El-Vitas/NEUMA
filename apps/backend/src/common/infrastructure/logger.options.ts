import type { IncomingMessage, ServerResponse } from 'node:http';
import { formatChileanTime } from '@company-brain/shared';
import { type LoggerOptions, stdSerializers } from 'pino';

/** Un error como se escribe en el log: su mensaje y su traza, nunca el objeto entero, que puede cargar datos. */
const writeLoggedError = (object: Record<string, unknown>): Record<string, unknown> => {
  if (object.err === undefined) return object;
  const errValue = object.err;
  if (errValue instanceof Error) return { ...object, err: { message: errValue.message, stack: errValue.stack } };
  if (typeof errValue === 'string') return { ...object, err: { message: errValue } };
  return { ...object, err: { message: '[non-string error]' } };
};

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
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token', 'secret', 'email'],
  },
  serializers: {
    err: stdSerializers.err,
    req: (req: IncomingMessage) => ({ method: req.method, url: req.url }),
    res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
  },
  timestamp: formatChileanTime,
});
