import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import pino from 'pino';
import { AppModule } from '../../app.module';
import { MCP_SERVER_DEPENDENCIES } from './constants/mcp.constants';
import { createMcpServer } from './mcp.server';
import { startMcpStdioServer } from './mcp.transport';
import type { McpErrorReporter, McpServerDependencies } from './types/mcp.types';

const mcpLogger = pino(
  {
    level: 'error',
    redact: {
      paths: ['token', 'secret', 'password', 'email'],
      remove: true,
    },
  },
  pino.destination(2),
);

const reportMcpError = (error: unknown): void => {
  const errorType = error instanceof Error ? error.name : typeof error;
  mcpLogger.error({ errorType }, 'MCP runtime error');
};

const bootstrapMcp = async (): Promise<void> => {
  const application = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const errorReporter: McpErrorReporter = { report: reportMcpError };
  const dependencies = application.get<McpServerDependencies>(MCP_SERVER_DEPENDENCIES);
  /* Las herramientas se eligen con lo que el token tiene al arrancar; cada llamada vuelve a preguntar. */
  const principalAtStart = await dependencies.principalResolver.resolve();
  const server = createMcpServer({ ...dependencies, errorReporter }, principalAtStart);
  await startMcpStdioServer(server);
};

void bootstrapMcp().catch(reportMcpError);
