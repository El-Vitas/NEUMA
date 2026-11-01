import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Result, USER_ROLE, type User } from '@neuma/shared';
import { toUser } from '../../common/utils/auth.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordAdapter } from '../auth/infrastructure/adapters/password.adapter';
import { assertEmailAvailable, assertNoAdminYet } from './domain/user.domain';
import { type AdminAlreadyExistsError, EmailAlreadyInUseError } from './domain/user.error';
import { ListUsersDto } from './dto/user.list.dto';
import { UpdatePasswordDto, UpdateUserDto } from './dto/user.update.dto';
import { UserRepository } from './infrastructure/persistence/user.repository';
import type { NewAccount, UserListResult } from './types/user.types';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly passwordAdapter: PasswordAdapter,
  ) {}

  async listUsers(dto: ListUsersDto): Promise<UserListResult> {
    const { items, total } = await this.userRepository.list({
      page: dto.page,
      pageSize: dto.pageSize,
      search: dto.search,
    });
    return { items, page: dto.page, pageSize: dto.pageSize, total };
  }

  async createUser(input: NewAccount): Promise<Result<User, EmailAlreadyInUseError>> {
    const existing = await this.userRepository.findByEmail(input.email);
    const emailError = assertEmailAvailable(existing, input.email);
    if (emailError !== null) {
      return Result.fail(emailError);
    }

    const hashedPassword = await this.passwordAdapter.hash(input.password);
    const created = await this.userRepository.create({ ...input, password: hashedPassword });
    return created === null ? Result.fail(new EmailAlreadyInUseError(input.email)) : Result.ok(toUser(created));
  }

  /** The only way in on a fresh install: run from the server's command line, and only while no admin exists. */
  async createFirstAdmin(
    input: Omit<NewAccount, 'role'>,
  ): Promise<Result<User, AdminAlreadyExistsError | EmailAlreadyInUseError>> {
    const adminError = assertNoAdminYet(await this.userRepository.countAdmins());
    if (adminError !== null) return Result.fail(adminError);
    return this.createUser({ ...input, role: USER_ROLE.ADMIN });
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<{ id: string; email: string; name: string }> {
    const user = await this.prisma.models.User.where({ id }).first();
    if (!user) throw new NotFoundException('User not found');
    if (dto.name === undefined) return { email: user.email, id: user.id, name: user.name };

    const updated = await this.prisma.models.User.select('id', 'email', 'name')
      .where({ id })
      .update({ name: dto.name });
    if (updated === null) throw new NotFoundException('User not found');

    return updated;
  }

  async updatePassword(id: string, dto: UpdatePasswordDto): Promise<void> {
    const user = await this.prisma.models.User.where({ id }).first();
    if (!user) throw new NotFoundException('User not found');

    const isValid = await this.passwordAdapter.compare(dto.currentPassword, user.password);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const hashedPassword = await this.passwordAdapter.hash(dto.newPassword);
    const updated = await this.userRepository.replacePasswordAndRevokeSessions(id, hashedPassword);
    if (!updated) throw new NotFoundException('User not found');
  }
}
