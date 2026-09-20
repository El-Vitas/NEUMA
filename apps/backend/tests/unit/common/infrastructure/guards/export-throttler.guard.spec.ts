import { describe, expect, it } from 'bun:test';
import type { FastifyRequest } from 'fastify';
import { ExportThrottlerGuard } from '../../../../../src/common/infrastructure/guards/export-throttler.guard';
import type { RequestUser } from '../../../../../src/common/types/auth.types';

/** El guardia solo decide a quién se le cuenta; lo demás lo pone la librería. */
class GuardUnderTest extends ExportThrottlerGuard {
  askTracker(request: FastifyRequest & { user?: RequestUser }): Promise<string> {
    return this.getTracker(request);
  }
}

const guard = Object.create(GuardUnderTest.prototype) as GuardUnderTest;

const requestFrom = (userId: null | string, ip: string): FastifyRequest & { user?: RequestUser } =>
  ({
    ip,
    ...(userId === null
      ? {}
      : { user: { data: null, payload: { email: 'quien@ejemplo.com', name: 'Quien', role: 'ADMIN', sub: userId } } }),
  }) as FastifyRequest & { user?: RequestUser };

describe('a quién se le cuentan las exportaciones', () => {
  it('counts them against whoever asked, not against where they asked from', async () => {
    expect(await guard.askTracker(requestFrom('person-1', '10.0.0.1'))).toBe('person-1');
  });

  /** Una oficina entera sale por una sola dirección: contar por ahí castigaría a quien no pidió nada. */
  it('tells two people behind one address apart', async () => {
    const [one, other] = await Promise.all([
      guard.askTracker(requestFrom('person-1', '10.0.0.1')),
      guard.askTracker(requestFrom('person-2', '10.0.0.1')),
    ]);

    expect(one).not.toBe(other);
  });

  /** Sin sesión no hay a quién contarle, y la dirección es lo único que queda. */
  it('falls back to the address when nobody is signed in', async () => {
    expect(await guard.askTracker(requestFrom(null, '10.0.0.9'))).toBe('10.0.0.9');
  });
});
