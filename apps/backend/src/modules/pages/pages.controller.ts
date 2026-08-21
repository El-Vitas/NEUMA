import type { Result } from '@company-brain/shared';
import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { PageAccessDeniedError, type PageLifecycleError } from './domain/page.error';
import { UpdatePageCoverDto } from './dto/page.cover.update.dto';
import { CreatePageDto } from './dto/page.create.dto';
import { DuplicatePageDto } from './dto/page.duplicate.dto';
import { UpdatePageIconDto } from './dto/page.icon.update.dto';
import { ListPagesDto } from './dto/page.list.dto';
import { SetPageLockDto } from './dto/page.lock.dto';
import { MovePageDto } from './dto/page.move.dto';
import { SetPageOwnerDto } from './dto/page.owner.dto';
import { RenamePageDto } from './dto/page.rename.dto';
import { RestorePageDto } from './dto/page.restore.dto';
import { UpdatePageDto } from './dto/page.update.dto';
import { SetPageVerificationDto } from './dto/page.verification.dto';
import { PagesService } from './pages.service';
import type { PageDescendantsPreview, PageRestoreOutcome } from './types/page.types';

@Controller('spaces/:spaceId/pages')
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Param('spaceId') spaceId: string, @Query() dto: ListPagesDto, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return this.pagesService.list(spaceId, workspace.id, payload.sub, payload.role, dto.includeTrashed);
  }

  @Get(':pageId')
  @UseGuards(JwtAuthGuard)
  async getAccessible(
    @Param('spaceId') spaceId: string,
    @Param('pageId') pageId: string,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.getAccessible(pageId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) {
      throw result.getError();
    }
    const page = result.getValue();
    if (page.spaceId !== spaceId) {
      throw new PageAccessDeniedError();
    }
    return page;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Param('spaceId') spaceId: string, @Body() dto: CreatePageDto, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.create(
      {
        content: dto.content,
        createdById: payload.sub,
        parentId: dto.parentId ?? null,
        propertyValues: dto.propertyValues ?? null,
        role: payload.role,
        spaceId,
        title: dto.title,
        userId: payload.sub,
        workspaceId: workspace.id,
      },
      payload.role,
    );
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Patch(':pageId')
  @UseGuards(JwtAuthGuard)
  async update(@Param('pageId') pageId: string, @Body() dto: UpdatePageDto, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.update(
      {
        content: dto.content,
        pageId,
        propertyValues: dto.propertyValues ?? null,
        role: payload.role,
        title: dto.title,
        updatedById: payload.sub,
        userId: payload.sub,
        workspaceId: workspace.id,
      },
      payload.role,
    );
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Patch(':pageId/title')
  @UseGuards(JwtAuthGuard)
  async rename(@Param('pageId') pageId: string, @Body() dto: RenamePageDto, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.rename(pageId, dto.title, payload.sub, workspace.id, payload.role);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Patch(':pageId/icon')
  @UseGuards(JwtAuthGuard)
  async updateIcon(
    @Param('pageId') pageId: string,
    @Body() dto: UpdatePageIconDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.updateIcon(
      pageId,
      dto.icon ?? null,
      payload.sub,
      workspace.id,
      payload.role,
    );
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Patch(':pageId/verification')
  @UseGuards(JwtAuthGuard)
  async setVerification(
    @Param('pageId') pageId: string,
    @Body() dto: SetPageVerificationDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.setVerification(
      pageId,
      dto.verified,
      dto.expiresAt,
      payload.sub,
      workspace.id,
      payload.role,
    );
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Patch(':pageId/owner')
  @UseGuards(JwtAuthGuard)
  async setOwner(
    @Param('pageId') pageId: string,
    @Body() dto: SetPageOwnerDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.setOwner(pageId, dto.ownerId, payload.sub, workspace.id, payload.role);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Patch(':pageId/cover')
  @UseGuards(JwtAuthGuard)
  async updateCover(
    @Param('pageId') pageId: string,
    @Body() dto: UpdatePageCoverDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.updateCover(
      pageId,
      dto.cover ?? null,
      payload.sub,
      workspace.id,
      payload.role,
    );
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Post(':pageId/duplicate')
  @UseGuards(JwtAuthGuard)
  async duplicate(
    @Param('pageId') pageId: string,
    @Body() dto: DuplicatePageDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.duplicate(
      pageId,
      dto.includeChildren ?? false,
      dto.title ?? null,
      payload.sub,
      workspace.id,
      payload.role,
    );
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Patch(':pageId/lock')
  @UseGuards(JwtAuthGuard)
  async setLocked(
    @Param('pageId') pageId: string,
    @Body() dto: SetPageLockDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.setLocked(pageId, dto.locked, payload.sub, workspace.id, payload.role);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Patch(':pageId/move')
  @UseGuards(JwtAuthGuard)
  async move(
    @Param('pageId') pageId: string,
    @Body() dto: MovePageDto,
    @Headers('x-mutation-id') mutationId: string,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.move(
      pageId,
      dto.parentId ?? null,
      dto.targetSpaceId ?? null,
      payload.sub,
      workspace.id,
      mutationId,
      payload.role,
    );
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Post(':pageId/trash')
  @UseGuards(JwtAuthGuard)
  async trash(
    @Param('pageId') pageId: string,
    @Headers('x-mutation-id') mutationId: string,
    @User('payload') payload: TokenPayload,
  ) {
    return this.resolveLifecycleMutation(payload, (workspaceId) =>
      this.pagesService.trash(pageId, payload.sub, workspaceId, mutationId, payload.role),
    );
  }

  @Post(':pageId/restore')
  @UseGuards(JwtAuthGuard)
  async restore(
    @Param('pageId') pageId: string,
    @Body() dto: RestorePageDto,
    @Headers('x-mutation-id') mutationId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<PageRestoreOutcome> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.restore(
      pageId,
      payload.sub,
      workspace.id,
      mutationId,
      payload.role,
      dto.includeChildren,
    );
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Get(':pageId/trash-preview')
  @UseGuards(JwtAuthGuard)
  async trashPreview(
    @Param('pageId') pageId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<PageDescendantsPreview> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.previewTrashCascade(pageId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Get(':pageId/restore-preview')
  @UseGuards(JwtAuthGuard)
  async restorePreview(
    @Param('pageId') pageId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<PageDescendantsPreview> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.previewRestoreCascade(pageId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Delete(':pageId')
  @UseGuards(JwtAuthGuard)
  async deleteForever(@Param('pageId') pageId: string, @User('payload') payload: TokenPayload): Promise<boolean> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.deleteForever(pageId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  private async resolveLifecycleMutation(
    payload: TokenPayload,
    action: (workspaceId: string) => Promise<Result<boolean, PageAccessDeniedError | PageLifecycleError>>,
  ): Promise<boolean> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await action(workspace.id);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }
}
