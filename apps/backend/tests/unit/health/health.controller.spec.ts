import { describe, expect, test } from 'bun:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { HEALTH_READINESS_TIMEOUT_MS } from '../../../src/common/constants/health.constants';
import type { DatabaseHealthCheck } from '../../../src/common/types/health.types';
import { HealthController } from '../../../src/health/health.controller';

const databaseThatIs = (reachable: boolean, seenTimeouts: number[] = []): DatabaseHealthCheck => ({
  isReachable: (timeoutMs: number) => {
    seenTimeouts.push(timeoutMs);
    return Promise.resolve(reachable);
  },
});

describe('HealthController', () => {
  test('liveness answers without asking the database', () => {
    const seenTimeouts: number[] = [];
    const controller = new HealthController(databaseThatIs(false, seenTimeouts));

    expect(controller.check()).toEqual({ status: 'ok' });
    expect(seenTimeouts).toEqual([]);
  });

  test('readiness answers ok when the database replies within the timeout', async () => {
    const seenTimeouts: number[] = [];
    const controller = new HealthController(databaseThatIs(true, seenTimeouts));

    expect(await controller.ready()).toEqual({ status: 'ok' });
    expect(seenTimeouts).toEqual([HEALTH_READINESS_TIMEOUT_MS]);
  });

  test('readiness answers 503 when the database is unreachable', () => {
    const controller = new HealthController(databaseThatIs(false));

    expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
