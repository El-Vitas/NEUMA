import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Result } from '@neuma/shared';
import katex from 'katex';
import { MCP_DIAGRAM_WORKER_FILE, MCP_DIAGRAM_WORKER_READY } from '../../constants/mcp.constants';
import {
  MCP_DIAGRAM_CHECK_TIMEOUT_MS,
  MCP_DIAGRAM_CHECKER_START_TIMEOUT_MS,
  MCP_DIAGRAM_CHECKS_WAITING_MAX,
} from '../../constants/mcp.limits.constants';
import { diagramCheckAnswerSchema } from '../../schemas/mcp.pages.schemas';
import type { McpDiagramCheckAnswer, McpDrawingValidator, McpPendingDiagramCheck } from '../../types/mcp.pages.types';
import { McpDiagramCheckerBusyError } from '../errors/mcp.diagram-busy.error';
import { McpDiagramCheckTimeoutError } from '../errors/mcp.diagram-timeout.error';

/**
 * Mermaid runs in a separate worker because it needs a fake window, which in the backend process
 * would make other libraries think they run in a browser. If the worker fails to start, answer or
 * dies, the check fails as infrastructure does (write skipped, error logged) and the next check
 * restarts the worker. A diagram that could not be checked is never accepted.
 */
@Injectable()
export class McpDrawingValidatorAdapter implements McpDrawingValidator, OnModuleDestroy {
  private checker: Promise<Worker> | null = null;
  private running: Worker | null = null;
  private nextId = 0;
  private readonly pending = new Map<number, McpPendingDiagramCheck>();
  /** Serializes checks: the worker reads one at a time, and each timeout starts only on its turn. */
  private turn: Promise<void> = Promise.resolve();
  private waiting = 0;

  /**
   * A diagram that takes too long restarts the worker and fails alone; the queued ones continue
   * on a fresh worker. With the queue full, the newcomer fails at once so it can retry.
   */
  checkDiagram(source: string): Promise<Result<string, string>> {
    if (this.waiting >= MCP_DIAGRAM_CHECKS_WAITING_MAX)
      return Promise.reject(new McpDiagramCheckerBusyError(MCP_DIAGRAM_CHECKS_WAITING_MAX));
    this.waiting += 1;
    const checked = this.turn
      .then(() => this.checkNow(source))
      .finally(() => {
        this.waiting -= 1;
      });
    this.turn = checked.then(
      () => undefined,
      () => undefined,
    );
    return checked;
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

  private async checkNow(source: string): Promise<Result<string, string>> {
    const worker = await this.startOnce();
    const answer = await this.ask(worker, source);
    return 'fault' in answer ? Result.fail(answer.fault) : Result.ok(answer.diagramType);
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
        this.stop(new McpDiagramCheckTimeoutError(MCP_DIAGRAM_CHECK_TIMEOUT_MS));
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

  /** An unreadable answer is a worker failure, not a diagram failure. */
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

  /** The next diagram spawns a new worker. */
  private stop(error: Error): void {
    this.running?.terminate();
    this.running = null;
    this.checker = null;
    const waiting = [...this.pending.values()];
    this.pending.clear();
    for (const check of waiting) check.fail(error);
  }
}
