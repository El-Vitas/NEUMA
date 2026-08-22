import { BadRequestException, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { MUTATION_ID_HEADER, MUTATION_ID_SHAPE } from '../../constants/mutation.constants';

/**
 * The name a change came with, refused when it did not come with one.
 *
 * Asked for here rather than in each handler because the answer decides whether
 * the change can be recorded at all: without it the door is open to a caller
 * whose second change to a page fails against the first, with a five hundred
 * that says nothing about why.
 */
export const MutationId = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const request = context.switchToHttp().getRequest<FastifyRequest>();
  const value = request.headers[MUTATION_ID_HEADER];
  if (typeof value !== 'string' || !MUTATION_ID_SHAPE.test(value)) {
    throw new BadRequestException(`${MUTATION_ID_HEADER} must be a UUID`);
  }
  return value;
});
