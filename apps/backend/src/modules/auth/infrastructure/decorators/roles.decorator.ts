import { SetMetadata } from '@nestjs/common';

import { ROLES_KEY } from '../../../../common/constants/auth.constants';
import type { Role } from '../../../../common/types/auth.types';

export const Roles = (...roles: readonly Role[]): ClassDecorator & MethodDecorator => SetMetadata(ROLES_KEY, roles);
