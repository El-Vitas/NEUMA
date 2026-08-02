import { type UserRole } from '@company-brain/shared';
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../constants/auth.constants';
import type { PermissionEntry, RequestUser } from '../../types/auth.types';
import { getPermissionsForRole, isUserRole } from '../../utils/auth.utils';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<readonly PermissionEntry[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const role = this.resolveRole(request.user);
    if (role === null) {
      return false;
    }

    const rolePermissions = getPermissionsForRole(role);
    return required.every((permission) =>
      rolePermissions.some((entry) => entry.action === permission.action && entry.resource === permission.resource),
    );
  }

  private resolveRole(user: RequestUser | undefined): null | UserRole {
    const role = user?.payload.role;
    if (role === undefined || !isUserRole(role)) {
      return null;
    }
    return role;
  }
}
