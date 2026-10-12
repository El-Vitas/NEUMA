import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CACHE_CONTROL_HEADER,
  CACHE_CONTROL_NO_STORE,
  HTTP_STATUS_CREATED,
} from '../../common/constants/http.constants';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { AccessTokensService } from './access-tokens.service';
import { ACCESS_TOKENS_ROUTE, ACCESS_TOKENS_WORKSPACE_SEGMENT } from './constants/access-tokens.constants';
import type {
  AccessTokenOwner,
  AccessTokenRecord,
  AccessTokenWorkspaceRecord,
  CreatedAccessToken,
} from './domain/access-token.domain.types';
import { UpdateAccessTokenAccessDto } from './dto/access-token.access.dto';
import { CreateAccessTokenDto } from './dto/access-token.create.dto';

/** No route takes the token owner as input: it always comes from the session, so there is no foreign id to probe. */
@Controller(ACCESS_TOKENS_ROUTE)
@UseGuards(JwtAuthGuard)
export class AccessTokensController {
  constructor(
    private readonly accessTokensService: AccessTokensService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  async list(@User('payload') payload: TokenPayload): Promise<readonly AccessTokenRecord[]> {
    return this.accessTokensService.listTokens(await this.ownerOf(payload));
  }

  /** The response carries the secret, shown only once, so no cache may store it. */
  @HttpCode(HTTP_STATUS_CREATED)
  @Header(CACHE_CONTROL_HEADER, CACHE_CONTROL_NO_STORE)
  @Post()
  async create(@Body() dto: CreateAccessTokenDto, @User('payload') payload: TokenPayload): Promise<CreatedAccessToken> {
    const result = await this.accessTokensService.createToken(await this.ownerOf(payload), {
      access: dto.access,
      expiresAt: dto.expiresAt === undefined ? null : new Date(dto.expiresAt),
      name: dto.name,
    });
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Patch(':tokenId/access')
  async updateAccess(
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
    @Body() dto: UpdateAccessTokenAccessDto,
    @User('payload') payload: TokenPayload,
  ): Promise<AccessTokenRecord> {
    const result = await this.accessTokensService.updateAccess(await this.ownerOf(payload), tokenId, dto.access);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Delete(':tokenId')
  async revoke(
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<{ readonly tokenId: string }> {
    const result = await this.accessTokensService.revokeToken(payload.sub, tokenId);
    if (result.isFail()) throw result.getError();
    return { tokenId };
  }

  @Get(ACCESS_TOKENS_WORKSPACE_SEGMENT)
  async listWorkspace(@User('payload') payload: TokenPayload): Promise<readonly AccessTokenWorkspaceRecord[]> {
    const result = await this.accessTokensService.listWorkspaceTokens(await this.ownerOf(payload));
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Delete(`${ACCESS_TOKENS_WORKSPACE_SEGMENT}/:tokenId`)
  async revokeInWorkspace(
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<{ readonly tokenId: string }> {
    const result = await this.accessTokensService.revokeWorkspaceToken(await this.ownerOf(payload), tokenId);
    if (result.isFail()) throw result.getError();
    return { tokenId };
  }

  private async ownerOf(payload: TokenPayload): Promise<AccessTokenOwner> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return { role: payload.role, userId: payload.sub, workspaceId: workspace.id };
  }
}
