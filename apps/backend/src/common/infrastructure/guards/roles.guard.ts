import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../constants/auth.constants';
import type { RequestUser, Role } from '../../types/auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(readonly _reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this._reflector.getAllAndOverride<readonly Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const userRole = request.user?.payload.role;
    if (userRole === undefined) {
      return false;
    }

    return (requiredRoles as readonly string[]).includes(userRole);
  }
}
