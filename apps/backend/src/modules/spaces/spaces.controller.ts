import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { CreateSpaceDto } from './dto/space.create.dto';
import { DescribeSpaceDto } from './dto/space.describe.dto';
import { UpdateSpaceIconDto } from './dto/space.icon.update.dto';
import { AddSpaceMemberDto } from './dto/space.member.add.dto';
import { SpaceMoveAccessLossQueryDto } from './dto/space.move-access-loss.query.dto';
import { RenameSpaceDto } from './dto/space.rename.dto';
import { ReorderSpaceDto } from './dto/space.reorder.dto';
import { SpacesService } from './spaces.service';

@Controller('spaces')
export class SpacesController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return this.spacesService.listAccessible(workspace.id, payload.sub, payload.role);
  }

  @Get('shared-with-me')
  @UseGuards(JwtAuthGuard)
  async listSharedWithMe(@User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return this.spacesService.listSharedWithMe(workspace.id, payload.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateSpaceDto, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.spacesService.create(
      { name: dto.name, slug: dto.slug, visibility: dto.visibility, workspaceId: workspace.id },
      payload.role,
    );
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Patch(':spaceId/name')
  @UseGuards(JwtAuthGuard)
  async rename(@Param('spaceId') spaceId: string, @Body() dto: RenameSpaceDto, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.spacesService.rename(spaceId, dto.name, workspace.id, payload.sub, payload.role);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Patch(':spaceId/description')
  @UseGuards(JwtAuthGuard)
  async describeSpace(
    @Param('spaceId') spaceId: string,
    @Body() dto: DescribeSpaceDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    // A blank description clears it.
    const said = dto.description?.trim();
    const description = said === undefined || said === '' ? null : said;
    const result = await this.spacesService.describeSpace(
      spaceId,
      description,
      workspace.id,
      payload.sub,
      payload.role,
    );
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Patch(':spaceId/order')
  @UseGuards(JwtAuthGuard)
  async reorder(
    @Param('spaceId') spaceId: string,
    @Body() dto: ReorderSpaceDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.spacesService.reorder(
      spaceId,
      dto.beforeSpaceId ?? null,
      workspace.id,
      payload.sub,
      payload.role,
    );
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Patch(':spaceId/icon')
  @UseGuards(JwtAuthGuard)
  async updateIcon(
    @Param('spaceId') spaceId: string,
    @Body() dto: UpdateSpaceIconDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.spacesService.updateIcon(
      spaceId,
      dto.icon ?? null,
      workspace.id,
      payload.sub,
      payload.role,
    );
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Get(':spaceId/members')
  @UseGuards(JwtAuthGuard)
  async listMembers(@Param('spaceId') spaceId: string, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.spacesService.listAssignableMembers(spaceId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Post(':spaceId/members')
  @UseGuards(JwtAuthGuard)
  async addMember(
    @Param('spaceId') spaceId: string,
    @Body() dto: AddSpaceMemberDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.spacesService.addMember(spaceId, dto.userId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Get(':spaceId/move-access-loss')
  @UseGuards(JwtAuthGuard)
  async moveAccessLoss(
    @Param('spaceId') spaceId: string,
    @Query() dto: SpaceMoveAccessLossQueryDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.spacesService.countMoveAccessLoss(
      spaceId,
      dto.targetSpaceId,
      workspace.id,
      payload.sub,
      payload.role,
    );
    if (result.isFail()) {
      throw result.getError();
    }
    return { count: result.getValue() };
  }
}
