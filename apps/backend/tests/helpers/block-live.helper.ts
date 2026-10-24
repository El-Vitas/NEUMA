import multipart from '@fastify/multipart';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { z } from 'zod';
import { AppModule } from '@/app.module';
import { MULTIPART_LIMITS } from '@/common/constants/storage.constants';
import { GlobalExceptionFilter } from '@/common/infrastructure/filters/global.exception.filter';
import { BlockLiveGateway } from '@/modules/blocks/block.live.gateway';
import { BLOCK_LIVE_DEFAULT_SETTINGS, BLOCK_LIVE_SETTINGS } from '@/modules/blocks/constants/block.live.constants';
import type { BlockLiveSettings } from '@/modules/blocks/types/block.live.types';
import type { TestApp } from './test-app.helper';

export type LiveMessage = Record<string, unknown>;

export interface LiveClosure {
  readonly code: number;
  readonly reason: string;
}

export interface LiveClient {
  readonly close: () => void;
  readonly closed: Promise<LiveClosure>;
  readonly expectSilence: (predicate: (message: LiveMessage) => boolean, durationMs: number) => Promise<void>;
  readonly messages: readonly LiveMessage[];
  readonly send: (message: object | string) => void;
  readonly waitFor: (predicate: (message: LiveMessage) => boolean, timeoutMs?: number) => Promise<LiveMessage>;
}

export interface LiveTestApp extends TestApp {
  readonly port: number;
}

const DEFAULT_WAIT_MS = 3000;
const POLL_MS = 10;
const liveMessageSchema = z.record(z.string(), z.unknown());

const sleep = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Same wiring as `bootstrapTestApp`, but listening on a free port and with the live channel settings given. */
export const bootstrapLiveTestApp = async (settings: Partial<BlockLiveSettings> = {}): Promise<LiveTestApp> => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(BLOCK_LIVE_SETTINGS)
    .useValue({ ...BLOCK_LIVE_DEFAULT_SETTINGS, ...settings })
    .compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { bufferLogs: true });
  app.useLogger(false);
  app.setGlobalPrefix('api/v1');
  await app.register(multipart, { limits: MULTIPART_LIMITS });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(moduleRef.get(Logger)));
  await app.init();
  await app.get(BlockLiveGateway).start();
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  if (address === null || typeof address === 'string') throw new Error('The test server did not expose a port');

  return {
    app,
    close: async (): Promise<void> => {
      await app.close();
    },
    get: <T>(token: abstract new (...args: never[]) => T): T => moduleRef.get(token),
    getServer: () => app.getHttpServer(),
    module: moduleRef,
    port: address.port,
  };
};

export const connectLiveClient = async (port: number): Promise<LiveClient> => {
  const socket = new WebSocket(`ws://127.0.0.1:${String(port)}/api/v1/blocks/live`);
  const messages: LiveMessage[] = [];
  socket.addEventListener('message', (event) => {
    messages.push(liveMessageSchema.parse(JSON.parse(String(event.data))));
  });
  const closed = new Promise<LiveClosure>((resolve) => {
    socket.addEventListener('close', (event) => {
      resolve({ code: event.code, reason: event.reason });
    });
  });
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => {
      resolve();
    });
    socket.addEventListener('error', () => {
      reject(new Error('The live socket could not be opened'));
    });
  });

  const waitFor = async (
    predicate: (message: LiveMessage) => boolean,
    timeoutMs = DEFAULT_WAIT_MS,
  ): Promise<LiveMessage> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = messages.find(predicate);
      if (found !== undefined) return found;
      await sleep(POLL_MS);
    }
    throw new Error(`No live message matched in ${String(timeoutMs)}ms. Received: ${JSON.stringify(messages)}`);
  };

  const expectSilence = async (predicate: (message: LiveMessage) => boolean, durationMs: number): Promise<void> => {
    await sleep(durationMs);
    const unexpected = messages.find(predicate);
    if (unexpected !== undefined) throw new Error(`Unexpected live message: ${JSON.stringify(unexpected)}`);
  };

  return {
    close: () => {
      socket.close();
    },
    closed,
    expectSilence,
    messages,
    send: (message) => {
      socket.send(typeof message === 'string' ? message : JSON.stringify(message));
    },
    waitFor,
  };
};
