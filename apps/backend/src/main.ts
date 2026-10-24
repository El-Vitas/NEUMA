import 'reflect-metadata';
import multipart from '@fastify/multipart';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { parseCorsOrigins } from './common/config/cors.config';
import { getTrustProxy } from './common/config/trust-proxy.config';
import { CORS_ORIGIN_KEY, PORT_KEY } from './common/constants/env.constants';
import { HTTP_STATUS_PAYLOAD_TOO_LARGE } from './common/constants/http.constants';
import { MULTIPART_LIMITS } from './common/constants/storage.constants';
import { GlobalExceptionFilter } from './common/infrastructure/filters/global.exception.filter';
import { readBearerToken } from './common/utils/auth.utils';
import { looksLikeAccessTokenSecret } from './modules/access-tokens/utils/access-token.utils';
import { RefreshSessionRetentionScheduler } from './modules/auth/infrastructure/schedulers/refresh-session.retention.scheduler';
import { BlockLiveGateway } from './modules/blocks/block.live.gateway';
import { MCP_ROUTE } from './modules/mcp/constants/mcp.constants';
import { MCP_REQUEST_BODY_LIMIT_BYTES } from './modules/mcp/constants/mcp.limits.constants';
import { isBodyTooLargeForCaller } from './modules/mcp/utils/mcp.request-size.utils';
import { NotificationRetentionScheduler } from './modules/notifications/infrastructure/schedulers/notification.retention.scheduler';
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
  const mcpPath = `/api/v1/${MCP_ROUTE}`;
  const server = app.getHttpAdapter().getInstance();
  server.addHook('onRoute', (route) => {
    if (route.url === mcpPath) route.bodyLimit = MCP_REQUEST_BODY_LIMIT_BYTES;
  });
  server.addHook('onRequest', async (request, reply) => {
    if (request.url !== mcpPath) return;
    const token = readBearerToken(request.headers.authorization);
    const isTooLarge = isBodyTooLargeForCaller({
      contentLength: request.headers['content-length'],
      hasTokenShape: token !== undefined && looksLikeAccessTokenSecret(token),
    });
    if (isTooLarge) await reply.code(HTTP_STATUS_PAYLOAD_TOO_LARGE).send();
  });

  await app.register(multipart, { limits: MULTIPART_LIMITS });

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  await app.init();
  await app.get(BlockLiveGateway).start();
  await app.listen(configService.getOrThrow<number>(PORT_KEY), '0.0.0.0');
  app.get(PageRetentionScheduler).start();
  app.get(NotificationRetentionScheduler).start();
  app.get(RefreshSessionRetentionScheduler).start();
};

void bootstrap();
