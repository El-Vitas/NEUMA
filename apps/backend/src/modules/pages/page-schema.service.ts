import { Result, USER_ROLE, type UserRole } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
import { PAGE_REPOSITORY, PAGE_SCHEMA_REPOSITORY } from './constants/pages.constants';
import {
  PageAccessDeniedError,
  type PageSchemaDefinitionError,
  PageSchemaNotFoundError,
  PageViewNotFoundError,
} from './domain/page.error';
import { pageCarriesSchema, validatePageSchemaDefinition, validatePageSchemaViews } from './domain/page-schema.domain';
import { buildPageViewOutcome } from './domain/page-view.domain';
import type { PageRepositoryContract } from './types/page.types';
import type {
  DefinePageSchemaInput,
  PageRowsSummary,
  PageSchemaRepositoryContract,
  PageSchemaSummary,
} from './types/page-schema.types';
import type { PageViewSummary } from './types/page-view.types';

@Injectable()
export class PageSchemaService {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pageRepository: PageRepositoryContract,
    @Inject(PAGE_SCHEMA_REPOSITORY) private readonly pageSchemaRepository: PageSchemaRepositoryContract,
  ) {}

  async defineSchema(
    input: DefinePageSchemaInput,
  ): Promise<Result<PageSchemaSummary, PageAccessDeniedError | PageSchemaDefinitionError>> {
    if (input.role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const page = await this.pageRepository.getAccessible(input.pageId, input.workspaceId, input.userId, input.role);
    if (page === null) return Result.fail(new PageAccessDeniedError());
    const properties = validatePageSchemaDefinition(input.properties);
    if (properties.isFail()) return Result.fail(properties.getError());
    const views = validatePageSchemaViews(input.views, properties.getValue());
    if (views.isFail()) return Result.fail(views.getError());
    const schema = await this.pageSchemaRepository.defineSchema(input.pageId, properties.getValue(), views.getValue());
    return Result.ok({ ...schema, spaceId: page.spaceId });
  }

  async getSchema(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<PageSchemaSummary, PageAccessDeniedError>> {
    const page = await this.pageRepository.getAccessible(pageId, workspaceId, userId, role);
    if (page === null) return Result.fail(new PageAccessDeniedError());
    const schema = await this.pageSchemaRepository.getSchema(pageId);
    return Result.ok({ ...schema, spaceId: page.spaceId });
  }

  async listRows(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<PageRowsSummary, PageAccessDeniedError | PageSchemaNotFoundError>> {
    const page = await this.pageRepository.getAccessible(pageId, workspaceId, userId, role);
    if (page === null) return Result.fail(new PageAccessDeniedError());
    const schemaProperties = await this.pageSchemaRepository.resolveSchemaProperties(pageId);
    if (!pageCarriesSchema(schemaProperties)) return Result.fail(new PageSchemaNotFoundError());
    const rows = await this.pageSchemaRepository.listRows(pageId, workspaceId, userId, role);
    return Result.ok({ rows, spaceId: page.spaceId });
  }

  async getView(
    pageId: string,
    viewName: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<Result<PageViewSummary, PageAccessDeniedError | PageSchemaNotFoundError | PageViewNotFoundError>> {
    const page = await this.pageRepository.getAccessible(pageId, workspaceId, userId, role);
    if (page === null) return Result.fail(new PageAccessDeniedError());
    const schema = await this.pageSchemaRepository.getSchema(pageId);
    if (!pageCarriesSchema(schema.properties)) return Result.fail(new PageSchemaNotFoundError());
    const view = schema.views.find((candidate) => candidate.name === viewName);
    if (view === undefined) return Result.fail(new PageViewNotFoundError());
    const rows = await this.pageSchemaRepository.listRows(pageId, workspaceId, userId, role);
    const outcome = buildPageViewOutcome(view, schema.properties, rows);
    return Result.ok({ outcome, spaceId: page.spaceId });
  }
}
