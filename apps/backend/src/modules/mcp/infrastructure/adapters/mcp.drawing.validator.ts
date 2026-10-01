import { Result } from '@company-brain/shared';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import katex from 'katex';
import { MCP_DIAGRAM_WORKER_FILE, MCP_DIAGRAM_WORKER_READY } from '../../constants/mcp.constants';
import {
  MCP_DIAGRAM_CHECK_TIMEOUT_MS,
  MCP_DIAGRAM_CHECKER_START_TIMEOUT_MS,
} from '../../constants/mcp.limits.constants';
import { diagramCheckAnswerSchema } from '../../schemas/mcp.pages.schemas';
import type { McpDiagramCheckAnswer, McpDrawingValidator, McpPendingDiagramCheck } from '../../types/mcp.pages.types';

/**
 * Revisa, antes de guardar, que lo que una página va a dibujar se pueda
 * dibujar: cada diagrama con el mismo Mermaid del portal, cada fórmula con
 * KaTeX.
 *
 * Mermaid corre en un worker aparte porque necesita una ventana simulada, y en
 * el proceso del backend esa ventana haría creer a otras librerías que corren
 * en un navegador. Si el worker no arranca, no contesta o se cae, la revisión
 * falla como falla la infraestructura —la escritura no se hace y el error
 * queda en el log— y el worker se vuelve a levantar para la siguiente. Nunca se
 * da por bueno un diagrama que no se pudo revisar.
 */
@Injectable()
export class McpDrawingValidatorAdapter implements McpDrawingValidator, OnModuleDestroy {
  private checker: Promise<Worker> | null = null;
  private running: Worker | null = null;
  private nextId = 0;
  private readonly pending = new Map<number, McpPendingDiagramCheck>();

  async checkDiagram(source: string): Promise<Result<string, string>> {
    const worker = await this.startOnce();
    const answer = await this.ask(worker, source);
    return 'fault' in answer ? Result.fail(answer.fault) : Result.ok(answer.diagramType);
  }

  checkFormula(latex: string, isOnItsOwnLine: boolean): Result<string, string> {
    try {
      katex.renderToString(latex, { displayMode: isOnItsOwnLine, throwOnError: true });
      return Result.ok(latex);
    } catch (error) {
      if (error instanceof katex.ParseError) return Result.fail(error.message);
      throw error;
    }
  }

  onModuleDestroy(): void {
    this.stop(new Error('The backend is shutting down'));
  }

  private startOnce(): Promise<Worker> {
    this.checker ??= this.start();
    return this.checker;
  }

  private start(): Promise<Worker> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(require.resolve(MCP_DIAGRAM_WORKER_FILE));
      this.running = worker;
      const late = setTimeout(() => {
        const error = new Error(
          `The diagram checker did not start within ${String(MCP_DIAGRAM_CHECKER_START_TIMEOUT_MS)} ms`,
        );
        this.stop(error);
        reject(error);
      }, MCP_DIAGRAM_CHECKER_START_TIMEOUT_MS);
      worker.onmessage = (event: MessageEvent<unknown>) => {
        if (event.data !== MCP_DIAGRAM_WORKER_READY) {
          this.settle(event.data);
          return;
        }
        clearTimeout(late);
        resolve(worker);
      };
      worker.onerror = (event: ErrorEvent) => {
        clearTimeout(late);
        const error = new Error(`The diagram checker stopped: ${event.message}`);
        this.stop(error);
        reject(error);
      };
    });
  }

  private ask(worker: Worker, source: string): Promise<McpDiagramCheckAnswer> {
    this.nextId += 1;
    const id = this.nextId;
    return new Promise((resolve, reject) => {
      const late = setTimeout(() => {
        this.stop(new Error(`The diagram checker took more than ${String(MCP_DIAGRAM_CHECK_TIMEOUT_MS)} ms`));
      }, MCP_DIAGRAM_CHECK_TIMEOUT_MS);
      this.pending.set(id, {
        fail: (error) => {
          clearTimeout(late);
          reject(error);
        },
        settle: (answer) => {
          clearTimeout(late);
          resolve(answer);
        },
      });
      worker.postMessage({ id, source });
    });
  }

  /** Una respuesta del worker, leída con forma; una que no se entiende es un fallo del worker, no del diagrama. */
  private settle(data: unknown): void {
    const answer = diagramCheckAnswerSchema.safeParse(data);
    if (!answer.success) {
      this.stop(new Error('The diagram checker answered something unreadable'));
      return;
    }
    const waiting = this.pending.get(answer.data.id);
    this.pending.delete(answer.data.id);
    waiting?.settle(answer.data);
  }

  /** Detiene el worker y hace fallar lo que esperaba, con el porqué; el próximo diagrama levanta uno nuevo. */
  private stop(error: Error): void {
    this.running?.terminate();
    this.running = null;
    this.checker = null;
    const waiting = [...this.pending.values()];
    this.pending.clear();
    for (const check of waiting) check.fail(error);
  }
}
