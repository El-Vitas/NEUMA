import { Injectable } from '@nestjs/common';
import { isUniqueViolation, or } from '@neuma/db';
import { USER_ROLE, type UserRole } from '@neuma/shared';
import type { FilterCondition, ModelFilterScope } from '../../../../common/types/model.filter.types';
import { PrismaService } from '../../../../prisma/prisma.service';
import { USER_SEARCH_LIKE_SPECIAL_SIGNS } from '../../constants/user.constants';
import type { UserListItem } from '../../types/user.types';

const buildContainsPattern = (text: string): string => `%${text.replaceAll(USER_SEARCH_LIKE_SPECIAL_SIGNS, '\\$&')}%`;

const matchesEveryUser = (user: ModelFilterScope<'User'>): FilterCondition => user.id.isNotNull();

const buildSearchFilter =
  (search: string | undefined) =>
  (user: ModelFilterScope<'User'>): FilterCondition => {
    if (!search) {
      return matchesEveryUser(user);
    }
    const pattern = buildContainsPattern(search);
    return or(user.email.ilike(pattern), user.name.ilike(pattern));
  };

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { page: number; pageSize: number; search: string | undefined }): Promise<{
    items: UserListItem[];
    total: number;
  }> {
    const filter = buildSearchFilter(params.search);
    return this.prisma.transaction(async (transaction) => {
      const users = transaction.orm.public.User;
      const items = await users
        .select('createdAt', 'email', 'id', 'isActive', 'name', 'role')
        .where(filter)
        .orderBy((user) => user.createdAt.desc())
        .limit(params.pageSize)
        .offset((params.page - 1) * params.pageSize)
        .all();
      const { total } = await users.where(filter).aggregate((aggregate) => ({ total: aggregate.count() }));
      return { items, total };
    });
  }

  /** `null` when another account already holds the email. */
  async create(data: { email: string; name: string; password: string; role: UserRole }): Promise<{
    email: string;
    id: string;
    name: string;
    role: UserRole;
  } | null> {
    try {
      return await this.prisma.models.User.select('email', 'id', 'name', 'role').create(data);
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  }

  async countAdmins(): Promise<number> {
    const { total } = await this.prisma.models.User.where({ role: USER_ROLE.ADMIN }).aggregate((aggregate) => ({
      total: aggregate.count(),
    }));
    return total;
  }

  /**
   * The new password and the revocation land together, so no old session outlives the change: the version bump
   * stops every refresh token and the deleted rows drop every family.
   */
  async replacePasswordAndRevokeSessions(id: string, hashedPassword: string): Promise<boolean> {
    return this.prisma.transaction(async (transaction) => {
      const { affectedRows } = await transaction.execute(
        this.prisma.sql`
          UPDATE "User" SET "password" = ${hashedPassword}, "tokenVersion" = "tokenVersion" + 1 WHERE "id" = ${id}
        `
          .affectedCount()
          .build(),
      );
      await transaction.orm.public.RefreshSession.where({ userId: id }).deleteAndCount();
      return affectedRows > 0;
    });
  }

  async findByEmail(email: string): Promise<{ id: string } | null> {
    return this.prisma.models.User.select('id').where({ email }).first();
  }
}
