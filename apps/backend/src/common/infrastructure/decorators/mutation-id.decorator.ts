import { BadRequestException, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { MUTATION_ID_HEADER, MUTATION_ID_SHAPE } from '../../constants/mutation.constants';

/** Rejects a missing id up front; without it later changes would fail with an opaque 500. */
export const MutationId = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const request = context.switchToHttp().getRequest<FastifyRequest>();
  const value = request.headers[MUTATION_ID_HEADER];
  if (typeof value !== 'string' || !MUTATION_ID_SHAPE.test(value)) {
    throw new BadRequestException(`${MUTATION_ID_HEADER} must be a UUID`);
  }
  return value;
});
