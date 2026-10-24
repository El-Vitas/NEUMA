import type { OnApplicationShutdown } from '@nestjs/common';

/** Runs a job at a fixed pace once started, and stops with the application. */
export abstract class IntervalScheduler implements OnApplicationShutdown {
  protected abstract readonly intervalMs: number;
  private timer: ReturnType<typeof setInterval> | undefined;

  start(): void {
    if (this.timer !== undefined) return;
    void this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.intervalMs);
  }

  onApplicationShutdown(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
  }

  abstract runOnce(): Promise<void>;
}
