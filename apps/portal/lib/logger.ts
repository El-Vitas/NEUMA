import { formatChileanTime } from '@neuma/shared';
import pino from 'pino';
import 'pino-pretty';
import { env } from '@/config/env.config';
import { LOGGER_REDACT_PATHS } from '@/shared/constants/logger.constants';

/** Pretty output spawns a worker thread that crashes under the test runner, so only development uses it. */
const wantsReadableOutput = env.NODE_ENV === 'development';

export const logger = pino({
  level: env.LOG_LEVEL,
  formatters: {
    level: (label: string) => ({ level: label.toUpperCase() }),
  },
  timestamp: formatChileanTime,
  redact: {
    paths: LOGGER_REDACT_PATHS,
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
