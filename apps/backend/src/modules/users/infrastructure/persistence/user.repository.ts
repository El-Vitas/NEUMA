import { Injectable } from '@nestjs/common';
import type { UserRole } from '@neuma/shared';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { UserListItem } from '../../types/user.types';

const buildSearchFilter = (search: string | undefined) => {
  if (!search) {
    return {};
  }
  return {
    OR: [
      { email: { contains: search, mode: 'insensitive' as const } },
      { name: { contains: search, mode: 'insensitive' as const } },
    ],
  };
};

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { page: number; pageSize: number; search: string | undefined }): Promise<{
    items: UserListItem[];
    total: number;
  }> {
    const where = buildSearchFilter(params.search);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, email: true, id: true, isActive: true, name: true, role: true },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        where,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  async create(data: { email: string; name: string; password: string }): Promise<{
    email: string;
    id: string;
    name: string;
    role: UserRole;
  }> {
    return this.prisma.user.create({
      data,
      select: { email: true, id: true, name: true, role: true },
    });
  }

  async findByEmail(email: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      select: { id: true },
      where: { email },
    });
  }
}
