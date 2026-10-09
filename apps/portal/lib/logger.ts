import { formatChileanTime } from '@company-brain/shared';
import pino from 'pino';
import 'pino-pretty';
import { env } from '@/config/env.config';

/** Pretty output spawns a worker thread that crashes under the test runner, so only development uses it. */
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
