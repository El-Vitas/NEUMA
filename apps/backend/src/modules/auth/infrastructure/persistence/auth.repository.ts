import { Injectable } from '@nestjs/common';

import type { AuthUserRow } from '../../../../common/types/auth.types';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(readonly _prisma: PrismaService) {}

  async findByEmail(email: string): Promise<AuthUserRow | null> {
    return this._prisma.models.User.select('email', 'id', 'isActive', 'name', 'password', 'role', 'tokenVersion')
      .where({ email })
      .first();
  }
}
