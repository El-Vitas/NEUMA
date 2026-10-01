import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { NODE_ENV_KEY } from '../constants/env.constants';
import { buildLogOptions } from './logger.options';

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
            ...buildLogOptions(logLevel ?? (isProduction ? 'info' : 'debug')),
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
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
