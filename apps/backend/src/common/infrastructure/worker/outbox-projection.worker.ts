import type { OutboxProjectionEvent, OutboxProjectionOutbox } from '../../types/outbox.types';

export abstract class OutboxProjectionWorker {
  protected constructor(
    private readonly outbox: OutboxProjectionOutbox,
    private readonly maxAttempts: number,
  ) {}

  async processBatch(limit: number): Promise<number> {
    const events = await this.outbox.claimPending(limit);
    for (const event of events) await this.processEvent(event);
    return events.length;
  }

  protected abstract projectEvent(event: OutboxProjectionEvent): Promise<void>;

  private async processEvent(event: OutboxProjectionEvent): Promise<void> {
    try {
      await this.projectEvent(event);
      await this.outbox.markProcessed(event.deliveryId);
    } catch (error) {
      if (event.attemptCount >= this.maxAttempts) await this.outbox.markFailed(event.deliveryId, error);
      else await this.outbox.markRetryable(event.deliveryId, error, event.attemptCount);
    }
  }
}
