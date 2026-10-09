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

/**
 * El log del MCP por terminal va a la salida de errores: la salida normal es
 * el canal por donde habla con el agente, y una línea de log ahí la rompería.
 * Escribe con las mismas reglas que el servidor HTTP.
 */
const mcpLogger = pino(buildLogOptions(MCP_STDIO_LOG_LEVEL), pino.destination(2));
const observer = createMcpObserver(mcpLogger);

const bootstrapMcp = async (): Promise<void> => {
  const application = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const dependencies = application.get<McpServerDependencies>(MCP_SERVER_DEPENDENCIES);
  /* Las herramientas se eligen con lo que el token tiene al arrancar; cada llamada vuelve a preguntar. */
  const principalAtStart = await dependencies.principalResolver.resolve();
  const server = createMcpServer({ ...dependencies, observer }, principalAtStart);
  await startMcpStdioServer(server);
};

/* Si no arranca, el proceso termina con un código de error: el programa que aloja al agente tiene que ver una falla, no una salida limpia. */
void bootstrapMcp().catch((error: unknown) => {
  observer.unexpected(error, 'MCP stdio start');
  process.exitCode = 1;
});
