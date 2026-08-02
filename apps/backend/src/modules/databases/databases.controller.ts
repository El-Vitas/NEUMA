import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { DatabasesService } from './databases.service';
import { CreateDatabaseDto } from './dto/database.create.dto';
import { CreateDatabasePropertyDto } from './dto/database.property.create.dto';
import { CreateDatabaseRecordDto } from './dto/database.record.create.dto';
import { CreateDatabaseViewDto } from './dto/database.view.create.dto';

@Controller('databases')
export class DatabasesController {
  constructor(
    private readonly databasesService: DatabasesService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return this.databasesService.listAccessible(workspace.id, payload.sub, payload.role);
  }

  @Get(':databaseId')
  @UseGuards(JwtAuthGuard)
  async get(@Param('databaseId') databaseId: string, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.databasesService.getAccessible(databaseId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateDatabaseDto, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.databasesService.create(
      { name: dto.name, slug: dto.slug, spaceId: dto.spaceId, template: dto.template, workspaceId: workspace.id },
      payload.sub,
      payload.role,
    );
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Post(':databaseId/properties')
  @UseGuards(JwtAuthGuard)
  async createProperty(
    @Param('databaseId') databaseId: string,
    @Body() dto: CreateDatabasePropertyDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.databasesService.createProperty({
      databaseId,
      role: payload.role,
      userId: payload.sub,
      workspaceId: workspace.id,
      property: {
        key: dto.key,
        label: dto.label,
        options: dto.options ?? null,
        required: dto.required,
        type: dto.type,
      },
    });
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Post(':databaseId/records')
  @UseGuards(JwtAuthGuard)
  async createRecord(
    @Param('databaseId') databaseId: string,
    @Body() dto: CreateDatabaseRecordDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.databasesService.createRecord({
      databaseId,
      propertyValues: dto.propertyValues,
      role: payload.role,
      title: dto.title,
      userId: payload.sub,
      workspaceId: workspace.id,
    });
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Get(':databaseId/records')
  @UseGuards(JwtAuthGuard)
  async listRecords(@Param('databaseId') databaseId: string, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.databasesService.listRecords(databaseId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Patch(':databaseId/records/:recordId')
  @UseGuards(JwtAuthGuard)
  async updateRecord(
    @Param('databaseId') databaseId: string,
    @Param('recordId') recordId: string,
    @Body() dto: CreateDatabaseRecordDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.databasesService.updateRecord({
      databaseId,
      propertyValues: dto.propertyValues,
      recordId,
      role: payload.role,
      title: dto.title,
      userId: payload.sub,
      workspaceId: workspace.id,
    });
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Post(':databaseId/views')
  @UseGuards(JwtAuthGuard)
  async createView(
    @Param('databaseId') databaseId: string,
    @Body() dto: CreateDatabaseViewDto,
    @User('payload') payload: TokenPayload,
  ) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.databasesService.createView({
      databaseId,
      role: payload.role,
      userId: payload.sub,
      workspaceId: workspace.id,
      view: { configuration: dto.configuration, isDefault: dto.isDefault, name: dto.name, type: dto.type },
    });
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }
}
