import { type AuthSession, Result } from '@company-brain/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { toUser } from '../../common/utils/auth.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordAdapter } from '../auth/infrastructure/adapters/password.adapter';
import { TokenAdapter } from '../auth/infrastructure/adapters/token.adapter';
import { assertEmailAvailable } from './domain/user.domain';
import type { EmailAlreadyInUseError } from './domain/user.error';
import { CreateUserDto } from './dto/user.create.dto';
import { ListUsersDto } from './dto/user.list.dto';
import { UpdatePasswordDto, UpdateUserDto } from './dto/user.update.dto';
import { UserRepository } from './infrastructure/persistence/user.repository';
import type { UserListResult } from './types/user.types';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly passwordAdapter: PasswordAdapter,
    private readonly tokenAdapter: TokenAdapter,
  ) {}

  async listUsers(dto: ListUsersDto): Promise<UserListResult> {
    const { items, total } = await this.userRepository.list({
      page: dto.page,
      pageSize: dto.pageSize,
      search: dto.search,
    });
    return { items, page: dto.page, pageSize: dto.pageSize, total };
  }

  async createUser(input: CreateUserDto): Promise<Result<AuthSession, EmailAlreadyInUseError>> {
    const existing = await this.userRepository.findByEmail(input.email);
    const emailError = assertEmailAvailable(existing, input.email);
    if (emailError !== null) {
      return Result.fail(emailError);
    }

    const hashedPassword = await this.passwordAdapter.hash(input.password);
    const created = await this.userRepository.create({
      email: input.email,
      name: input.name,
      password: hashedPassword,
    });

    const userSummary = toUser(created);
    const accessToken = await this.tokenAdapter.signAccessToken(userSummary);
    return Result.ok({ accessToken, user: userSummary });
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<{ id: string; email: string; name: string }> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const data: { name?: string } = {};
    if (dto.name !== undefined) data.name = dto.name;

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true },
    });

    return updated;
  }

  async updatePassword(id: string, dto: UpdatePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await this.passwordAdapter.compare(dto.currentPassword, user.password);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const hashedPassword = await this.passwordAdapter.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }
}
