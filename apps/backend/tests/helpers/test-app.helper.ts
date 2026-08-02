import type { Server } from 'node:http';
import multipart from '@fastify/multipart';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Logger } from 'nestjs-pino';
import { AppModule } from '@/app.module';
import { MAX_FILE_SIZE } from '@/common/constants/storage.constants';
import { GlobalExceptionFilter } from '@/common/infrastructure/filters/global.exception.filter';

/* eslint-disable no-restricted-syntax */
const silentLogger = {
  assign: () => {},
  debug: () => {},
  error: () => {},
  fatal: () => {},
  getLogger: () => {},
  log: () => {},
  setContext: () => {},
  verbose: () => {},
  warn: () => {},
} as unknown as Logger;

export interface TestApp {
  app: NestFastifyApplication;
  close: () => Promise<void>;
  get: <T>(token: abstract new (...args: never[]) => T) => T;
  getServer: () => Server;
  module: TestingModule;
}

export const bootstrapTestApp = async (): Promise<TestApp> => {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
    bufferLogs: true,
  });
  const configService: ConfigService = app.get(ConfigService);
  app.useLogger(silentLogger);
  app.setGlobalPrefix('api/v1');
  await app.register(multipart, {
    limits: { fileSize: MAX_FILE_SIZE },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(silentLogger, configService));
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return {
    app,
    close: async (): Promise<void> => {
      await app.close();
    },
    get: <T>(token: abstract new (...args: never[]) => T): T => moduleRef.get(token),
    getServer: (): Server => app.getHttpServer(),
    module: moduleRef,
  };
};
