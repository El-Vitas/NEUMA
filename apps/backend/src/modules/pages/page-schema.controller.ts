import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { PageAccessDeniedError } from './domain/page.error';
import { DefinePageSchemaDto } from './dto/page-schema.define.dto';
import { PageSchemaService } from './page-schema.service';

@Controller('spaces/:spaceId/pages/:pageId')
export class PageSchemaController {
  constructor(
    private readonly pageSchemaService: PageSchemaService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Post('schema')
  @UseGuards(JwtAuthGuard)
  async defineSchema(
    @Param('spaceId') spaceId: string,
    @Param('pageId') pageId: string,
    @Body() dto: DefinePageSchemaDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pageSchemaService.defineSchema({
      pageId,
      properties: dto.properties.map((property) => ({
        key: property.key,
        label: property.label,
        options: property.options ?? null,
        required: property.required,
        type: property.type,
      })),
      role: payload.role,
      userId: payload.sub,
      views: dto.views.map((view) => ({
        configuration: view.configuration,
        isDefault: view.isDefault,
        name: view.name,
        type: view.type,
      })),
      workspaceId: workspace.id,
    });
    if (result.isFail()) throw result.getError();
    return this.assertSpaceMatch(result.getValue(), spaceId);
  }

  @Get('schema')
  @UseGuards(JwtAuthGuard)
  async getSchema(
    @Param('spaceId') spaceId: string,
    @Param('pageId') pageId: string,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pageSchemaService.getSchema(pageId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) throw result.getError();
    return this.assertSpaceMatch(result.getValue(), spaceId);
  }

  @Get('rows')
  @UseGuards(JwtAuthGuard)
  async listRows(
    @Param('spaceId') spaceId: string,
    @Param('pageId') pageId: string,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pageSchemaService.listRows(pageId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) throw result.getError();
    const rows = this.assertSpaceMatch(result.getValue(), spaceId);
    return rows.rows;
  }

  @Get('views/:viewName')
  @UseGuards(JwtAuthGuard)
  async getView(
    @Param('spaceId') spaceId: string,
    @Param('pageId') pageId: string,
    @Param('viewName') viewName: string,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pageSchemaService.getView(pageId, viewName, workspace.id, payload.sub, payload.role);
    if (result.isFail()) throw result.getError();
    return this.assertSpaceMatch(result.getValue(), spaceId).outcome;
  }

  private assertSpaceMatch<TValue extends { readonly spaceId: string }>(value: TValue, spaceId: string): TValue {
    if (value.spaceId !== spaceId) throw new PageAccessDeniedError();
    return value;
  }
}
