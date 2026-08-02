import { SetMetadata } from '@nestjs/common';

import { PERMISSIONS_KEY } from '../../constants/auth.constants';

import type { PermissionEntry } from '../../types/auth.types';

export const Permissions = (...permissions: readonly PermissionEntry[]): ClassDecorator & MethodDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);
