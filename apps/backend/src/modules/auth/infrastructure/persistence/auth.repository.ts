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

  /** One atomic increment, so two logouts at once both count and neither token survives. */
  async revokeSessions(userId: string): Promise<void> {
    await this._prisma.runner.execute(
      this._prisma.sql`UPDATE "User" SET "tokenVersion" = "tokenVersion" + 1 WHERE "id" = ${userId}`
        .affectedCount()
        .build(),
    );
  }
}
