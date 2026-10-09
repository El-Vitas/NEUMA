import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LOG_LEVEL_KEY, NODE_ENV_KEY } from '../constants/env.constants';
import { buildLogOptions } from './logger.options';

@Module({
  exports: [PinoLoggerModule],
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>(NODE_ENV_KEY) === 'production';

        return {
          pinoHttp: {
            ...buildLogOptions(configService.getOrThrow<string>(LOG_LEVEL_KEY)),
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
