import { API_SEGMENTS, type AuthSession, RESOURCE_ROUTES, type User } from '@company-brain/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { HTTP_STATUS_CREATED } from '../../common/constants/http.constants';
import { Action, Resource } from '../../common/constants/permission.constants';
import { canRenameUser } from '../../common/domain/workspace.domain';
import { Permissions } from '../../common/infrastructure/decorators/permissions.decorator';
import { Public } from '../../common/infrastructure/decorators/public.decorator';
import { User as AuthUser } from '../../common/infrastructure/decorators/user.decorator';
import { CredentialsThrottlerGuard } from '../../common/infrastructure/guards/credentials-throttler.guard';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { PermissionsGuard } from '../../common/infrastructure/guards/permissions.guard';
import { UserInterceptor } from '../../common/infrastructure/interceptors/user.interceptor';
import type { TokenPayload } from '../../common/types/auth.types';
import { UserAccessDeniedError } from './domain/user.error';
import { CreateUserDto } from './dto/user.create.dto';
import { ListUsersDto } from './dto/user.list.dto';
import { UpdatePasswordDto, UpdateUserDto } from './dto/user.update.dto';
import type { UserListResult } from './types/user.types';
import { UsersService } from './users.service';

@Controller(RESOURCE_ROUTES.USERS)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(API_SEGMENTS.ME)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(UserInterceptor)
  getCurrentUser(@AuthUser() user: User): User {
    return user;
  }

  @Get()
  @Permissions({ action: Action.Read, resource: Resource.User })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  async listUsers(@Query() dto: ListUsersDto): Promise<UserListResult> {
    return this.usersService.listUsers(dto);
  }

  @HttpCode(HTTP_STATUS_CREATED)
  @Post()
  @Public()
  @UseGuards(CredentialsThrottlerGuard)
  async register(@Body() dto: CreateUserDto, @Res({ passthrough: true }) response: FastifyReply): Promise<AuthSession> {
    const result = await this.usersService.createUser(dto);
    if (result.isFail()) {
      throw result.getError();
    }
    const session = result.getValue();
    response.header('Location', `/api/v1/users/${session.user.id}`);
    return session;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @AuthUser('payload') payload: TokenPayload,
  ): Promise<{ id: string; email: string; name: string }> {
    if (!canRenameUser(payload.role, id, payload.sub)) {
      throw new UserAccessDeniedError();
    }
    return this.usersService.updateUser(id, dto);
  }

  /**
   * A password is changed by the person who knows it and nobody else, so the
   * account is the session's own. Taking the account from the address would
   * also hand out an oracle: anybody could try a password against any account
   * and read the answer in the status code.
   */
  @Patch(':id/password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async changePassword(
    @Param('id') id: string,
    @Body() dto: UpdatePasswordDto,
    @AuthUser('payload') payload: TokenPayload,
  ): Promise<void> {
    if (id !== payload.sub) {
      throw new UserAccessDeniedError();
    }
    await this.usersService.updatePassword(id, dto);
  }
}
