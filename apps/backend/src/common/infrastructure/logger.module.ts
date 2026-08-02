import type { IncomingMessage, ServerResponse } from 'node:http';
import { formatChileanTime } from '@company-brain/shared';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { stdSerializers } from 'pino';
import { NODE_ENV_KEY } from '../constants/env.constants';

@Module({
  exports: [PinoLoggerModule],
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>(NODE_ENV_KEY) === 'production';
        const logLevel = configService.get<string>('LOG_LEVEL');

        return {
          pinoHttp: {
            formatters: {
              level: (label: string) => ({ level: label.toUpperCase() }),
              log: (object: Record<string, unknown>) => {
                if (object.err === undefined) return object;
                const errValue = object.err;
                if (errValue instanceof Error) {
                  return {
                    ...object,
                    err: {
                      message: errValue.message,
                      stack: errValue.stack,
                    },
                  };
                }
                if (typeof errValue === 'string') {
                  return {
                    ...object,
                    err: { message: errValue },
                  };
                }
                return {
                  ...object,
                  err: { message: '[non-string error]' },
                };
              },
            },
            level: logLevel ?? (isProduction ? 'info' : 'debug'),
            serializers: {
              err: stdSerializers.err,
              req: (req: IncomingMessage) => ({
                method: req.method,
                url: req.url,
              }),
              res: (res: ServerResponse) => ({
                statusCode: res.statusCode,
              }),
            },
            timestamp: formatChileanTime,
            ...(isProduction
              ? {}
              : {
                  transport: {
                    options: {
                      colorize: true,
                      ignore: 'pid,hostname',
                      translateTime: false,
                    },
                    target: 'pino-pretty',
                  },
                }),
            redact: {
              censor: '[REDACTED]',
              paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token', 'secret', 'email'],
            },
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
