import { formatChileanTime } from '@company-brain/shared';
import pino from 'pino';
import 'pino-pretty';
import { env } from '@/config/env.config';

/**
 * La salida legible es para quien mira la consola mientras desarrolla. Pedirla
 * también en las pruebas levanta un hilo aparte que nadie lee y que además
 * revienta bajo el ejecutor de pruebas.
 */
const wantsReadableOutput = env.NODE_ENV === 'development';

export const logger = pino({
  level: env.LOG_LEVEL,
  formatters: {
    level: (label: string) => ({ level: label.toUpperCase() }),
  },
  timestamp: formatChileanTime,
  redact: {
    paths: ['password', 'token', 'secret', 'email', 'authorization'],
    censor: '[REDACTED]',
  },
  ...(wantsReadableOutput
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: false,
          },
        },
      }
    : {}),
});
