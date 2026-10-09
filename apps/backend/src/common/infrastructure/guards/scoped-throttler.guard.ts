import { ThrottlerGuard, type ThrottlerRequest } from '@nestjs/throttler';

/**
 * Un limitador que solo aplica los topes que nombra.
 *
 * Los topes con nombre del módulo se evalúan todos en cada ruta que lleva un
 * limitador, así que un tope nuevo alcanzaba sin querer a todas las puertas
 * limitadas: el de exportar llegó a cortar el inicio de sesión. Aquí cada
 * limitador dice a qué topes responde, y un tope nuevo no toca a nadie más.
 */
export abstract class ScopedThrottlerGuard extends ThrottlerGuard {
  protected abstract readonly enforcedThrottlers: readonly string[];

  protected override handleRequest(request: ThrottlerRequest): Promise<boolean> {
    if (!this.enforcedThrottlers.includes(request.throttler.name ?? '')) return Promise.resolve(true);
    return super.handleRequest(request);
  }
}
