import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../../prisma/prisma.service';
import type { DatabaseHealthCheck } from '../../types/health.types';

const failAfter = (milliseconds: number): Promise<never> =>
  new Promise((_resolve, reject) => {
    setTimeout(() => {
      reject(new Error(`database did not answer within ${String(milliseconds)} ms`));
    }, milliseconds);
  });

@Injectable()
export class DatabaseHealthRepository implements DatabaseHealthCheck {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  /** A trivial query on the app's own pool, so it fails when the backend cannot reach Postgres. */
  async isReachable(timeoutMs: number): Promise<boolean> {
    try {
      await Promise.race([
        this.prisma.runner.execute(this.prisma.sql`SELECT 1`.affectedCount().build()),
        failAfter(timeoutMs),
      ]);
      return true;
    } catch (error) {
      this.logger.error({ err: error }, 'readiness check could not reach the database');
      return false;
    }
  }
}
