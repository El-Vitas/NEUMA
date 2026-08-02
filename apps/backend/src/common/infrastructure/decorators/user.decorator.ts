import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import type { RequestUser } from '../../types/auth.types';

export const User = createParamDecorator((data: keyof RequestUser | undefined, ctx: ExecutionContext): unknown => {
  const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
  const user = request.user;
  if (user === undefined) {
    throw new UnauthorizedException('Usuario no autenticado');
  }
  if (data !== undefined) {
    return user[data];
  }
  return user.data;
});
