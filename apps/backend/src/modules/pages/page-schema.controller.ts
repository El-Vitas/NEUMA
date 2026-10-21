import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { readPagePropertyConfig } from '@neuma/shared';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { PageAccessDeniedError } from './domain/page.error';
import { DefinePageSchemaDto, RewritePageOptionDto } from './dto/page-schema.define.dto';
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
        computedDraft:
          property.formula === undefined && property.rollup === undefined
            ? null
            : { formula: property.formula ?? null, rollup: property.rollup ?? null },
        config: readPagePropertyConfig(property.config ?? null),
        key: property.key,
        label: property.label,
        options:
          property.options?.map((option) => ({
            color: option.color ?? null,
            group: option.group ?? null,
            id: option.id ?? null,
            value: option.value,
          })) ?? null,
        required: property.required,
        twoWay: property.twoWay ?? false,
        type: property.type,
      })),
      role: payload.role,
      userId: payload.sub,
      views: dto.views.map((view) => ({
        configuration: view.configuration,
        ...(view.id === undefined ? {} : { id: view.id }),
        isDefault: view.isDefault,
        name: view.name,
        type: view.type,
      })),
      workspaceId: workspace.id,
    });
    if (result.isFail()) throw result.getError();
    return this.assertSpaceMatch(result.getValue(), spaceId);
  }

  @Post('schema/properties/:propertyKey/rewrite-option')
  @UseGuards(JwtAuthGuard)
  async rewriteOption(
    @Param('spaceId') spaceId: string,
    @Param('pageId') pageId: string,
    @Param('propertyKey') propertyKey: string,
    @Body() dto: RewritePageOptionDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pageSchemaService.rewriteOption({
      optionId: dto.optionId,
      pageId,
      propertyKey,
      role: payload.role,
      to: dto.to ?? null,
      userId: payload.sub,
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

  private assertSpaceMatch<TValue extends { readonly spaceId: string }>(value: TValue, spaceId: string): TValue {
    if (value.spaceId !== spaceId) throw new PageAccessDeniedError();
    return value;
  }
}
