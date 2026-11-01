import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import type { PageViewWireOperation } from '@neuma/shared';
import { z } from 'zod';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { PageQueryInvalidError } from './domain/page-query.error';
import { ApplyPageViewOperationsDto, MovePageRowDto } from './dto/page-view.operations.dto';
import { PageViewOperationsService } from './page-view-operations.service';
import { listChangesSchema, wireOperationSchema } from './schemas/page-view.operations.schemas';
import type { ChangedView } from './types/page-view-operations.types';

@Controller('spaces/:spaceId/pages/:pageId/views/:viewId')
export class PageViewOperationsController {
  constructor(
    private readonly operationsService: PageViewOperationsService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Post('operations')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async apply(
    @Param('pageId') pageId: string,
    @Param('viewId') viewId: string,
    @Body() dto: ApplyPageViewOperationsDto,
    @User('payload') payload: TokenPayload,
  ): Promise<ChangedView> {
    const parsed = z.array(wireOperationSchema).safeParse(dto.operations);
    if (!parsed.success) throw new PageQueryInvalidError('The operations do not fit', parsed.error.issues);
    const operations: PageViewWireOperation[] = parsed.data;
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.operationsService.apply({
      mutationId: dto.mutationId,
      operations,
      pageId,
      role: payload.role,
      userId: payload.sub,
      viewId,
      workspaceId: workspace.id,
    });
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Post('move-row')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async moveRow(
    @Param('pageId') pageId: string,
    @Param('viewId') viewId: string,
    @Body() dto: MovePageRowDto,
    @User('payload') payload: TokenPayload,
  ): Promise<ChangedView> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const listChanges = listChangesSchema.safeParse(dto.listChanges ?? {});
    if (!listChanges.success) throw new PageQueryInvalidError('The list changes are not valid');
    const result = await this.operationsService.moveRow({
      after: dto.after,
      before: dto.before,
      listChanges: listChanges.data,
      mutationId: dto.mutationId,
      pageId,
      role: payload.role,
      rowId: dto.rowId,
      userId: payload.sub,
      values: dto.values ?? {},
      viewId,
      workspaceId: workspace.id,
    });
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }
}
