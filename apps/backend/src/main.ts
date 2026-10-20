import 'reflect-metadata';
import { join } from 'node:path';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { parseCorsOrigins } from './common/config/cors.config';
import { getTrustProxy } from './common/config/trust-proxy.config';
import { CORS_ORIGIN_KEY, PORT_KEY } from './common/constants/env.constants';
import { MULTIPART_LIMITS } from './common/constants/storage.constants';
import { GlobalExceptionFilter } from './common/infrastructure/filters/global.exception.filter';
import { PageRetentionScheduler } from './modules/pages/infrastructure/schedulers/page.retention.scheduler';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // A live socket never goes idle, so without this the server would
    // wait forever for it while shutting down.
    new FastifyAdapter({ forceCloseConnections: true, trustProxy: getTrustProxy() }),
    { bufferLogs: true },
  );
  const logger = app.get(Logger);

  app.useLogger(logger);
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);

  const corsOrigin = configService.get<string>(CORS_ORIGIN_KEY);
  app.enableCors({
    credentials: true,
    origin: parseCorsOrigins(corsOrigin),
  });
  app.setGlobalPrefix('api/v1');

  await app.register(multipart, { limits: MULTIPART_LIMITS });

  if (configService.get('NODE_ENV') !== 'production') {
    const uploadsPath = join(process.cwd(), 'uploads');
    await app.register(fastifyStatic, {
      root: join(uploadsPath, 'files'),
      prefix: '/api/v1/files/',
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  const port = configService.get<string>(PORT_KEY) ?? '3000';
  await app.listen(Number(port), '0.0.0.0');
  app.get(PageRetentionScheduler).start();
};

void bootstrap();
