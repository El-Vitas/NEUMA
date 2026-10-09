import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import pino from 'pino';
import { AppModule } from '../../app.module';
import { buildLogOptions } from '../../common/infrastructure/logger.options';
import { MCP_SERVER_DEPENDENCIES, MCP_STDIO_LOG_LEVEL } from './constants/mcp.constants';
import { createMcpObserver } from './lib/mcp.observer.lib';
import { createMcpServer } from './mcp.server';
import { startMcpStdioServer } from './mcp.transport';
import type { McpServerDependencies } from './types/mcp.types';

/** Logs to stderr: stdout is the agent channel and a log line there would corrupt it. */
const mcpLogger = pino(buildLogOptions(MCP_STDIO_LOG_LEVEL), pino.destination(2));
const observer = createMcpObserver(mcpLogger);

const bootstrapMcp = async (): Promise<void> => {
  const application = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const dependencies = application.get<McpServerDependencies>(MCP_SERVER_DEPENDENCIES);
  const principalAtStart = await dependencies.principalResolver.resolve();
  const server = createMcpServer({ ...dependencies, observer }, principalAtStart);
  await startMcpStdioServer(server);
};

/* A failed start must exit non-zero so the agent's host sees a failure. */
void bootstrapMcp().catch((error: unknown) => {
  observer.unexpected(error, 'MCP stdio start');
  process.exitCode = 1;
});
