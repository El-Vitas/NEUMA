import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import type { RequestUser } from '../../types/auth.types';

/**
 * Cuántas exportaciones seguidas admite una persona.
 *
 * Cuenta por quien pide y no por desde dónde: exportar exige sesión, así que
 * se sabe quién es, y una oficina entera comparte una dirección —contar por
 * dirección castigaría a quien no pidió nada—. Sin sesión no hay a quién
 * contarle, y entonces se vuelve a la dirección, que es lo único que queda.
 */
@Injectable()
export class ExportThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(request: FastifyRequest & { user?: RequestUser }): Promise<string> {
    return Promise.resolve(request.user?.payload.sub ?? request.ip);
  }
}
