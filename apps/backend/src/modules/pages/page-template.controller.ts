import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { SetDefaultPageTemplateDto } from './dto/page-template.default.dto';
import { SavePageTemplateDto } from './dto/page-template.save.dto';
import { PageTemplateService } from './page-template.service';
import type { PageTemplateActor } from './types/page-template.types';
import { readTemplateDraft } from './utils/page-template.utils';

@Controller('spaces/:spaceId/pages/:collectionId/templates')
export class PageTemplateController {
  constructor(
    private readonly pageTemplateService: PageTemplateService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Param('collectionId') collectionId: string, @User('payload') payload: TokenPayload) {
    const result = await this.pageTemplateService.list(collectionId, await this.readActor(payload));
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('collectionId') collectionId: string,
    @Body() dto: SavePageTemplateDto,
    @User('payload') payload: TokenPayload,
  ) {
    const draft = readTemplateDraft(dto);
    if (draft.isFail()) throw draft.getError();
    const result = await this.pageTemplateService.create(collectionId, draft.getValue(), await this.readActor(payload));
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Put('default')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async setDefault(
    @Param('collectionId') collectionId: string,
    @Body() dto: SetDefaultPageTemplateDto,
    @User('payload') payload: TokenPayload,
  ) {
    const result = await this.pageTemplateService.setDefault(
      collectionId,
      dto.templateId,
      await this.readActor(payload),
    );
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Patch(':templateId')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('collectionId') collectionId: string,
    @Param('templateId') templateId: string,
    @Body() dto: SavePageTemplateDto,
    @User('payload') payload: TokenPayload,
  ) {
    const draft = readTemplateDraft(dto);
    if (draft.isFail()) throw draft.getError();
    const result = await this.pageTemplateService.update(
      collectionId,
      templateId,
      draft.getValue(),
      await this.readActor(payload),
    );
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Delete(':templateId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('collectionId') collectionId: string,
    @Param('templateId') templateId: string,
    @User('payload') payload: TokenPayload,
  ) {
    const result = await this.pageTemplateService.delete(collectionId, templateId, await this.readActor(payload));
    if (result.isFail()) throw result.getError();
    return { deleted: true };
  }

  private async readActor(payload: TokenPayload): Promise<PageTemplateActor> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return { role: payload.role, userId: payload.sub, workspaceId: workspace.id };
  }
}
