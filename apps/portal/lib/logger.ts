import { formatChileanTime } from '@company-brain/shared';
import pino from 'pino';
import 'pino-pretty';
import { env } from '@/config/env.config';

const isProduction = env.NODE_ENV === 'production';

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
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: false,
          },
        },
      }),
});
