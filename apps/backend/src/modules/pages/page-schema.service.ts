import { Inject, Injectable } from '@nestjs/common';
import {
  type PageViewConfiguration,
  pageViewConfigurationSchema,
  Result,
  readPageViewConfiguration,
  USER_ROLE,
  type UserRole,
} from '@neuma/shared';
import { SchemaPropertyDefinitionError, SchemaViewValidationError } from '../../common/domain/schema.error';
import { rewriteSchemaOption } from '../../common/domain/schema-option.domain';
import { validateSchemaView } from '../../common/domain/schema-view.domain';
import {
  COLLECTION_QUERY_ROW_LIMIT,
  COLLECTION_ROW_LIMIT,
  PAGE_REPOSITORY,
  PAGE_SCHEMA_REPOSITORY,
  SCHEMA_CHANGED_MEANWHILE,
  SCHEMA_OPTION_ALREADY_MOVED,
} from './constants/pages.constants';
import {
  PageAccessDeniedError,
  PageSchemaChangedError,
  type PageSchemaDefinitionError,
  PageSchemaNotFoundError,
  PageViewNotFoundError,
} from './domain/page.error';
import { pageCarriesSchema, validatePageSchemaDefinition, validatePageSchemaViews } from './domain/page-schema.domain';
import {
  buildPageViewOutcome,
  countPageViewRows,
  findUnknownViewColumns,
  listPageViewRowsInReadingOrder,
} from './domain/page-view.domain';
import type { PageRepositoryContract } from './types/page.types';
import type {
  DefinePageSchemaInput,
  PageRowsSummary,
  PageSchemaDefinition,
  PageSchemaRepositoryContract,
  PageSchemaSummary,
  QueryPageRowsInput,
  RewritePageOptionInput,
  SetPageViewConfigurationInput,
} from './types/page-schema.types';
import type { PageViewSummary } from './types/page-view.types';

/** Filter and sort of the named view, or the caller's own, validated against the collection. */
const resolveQueryConfiguration = (
  schema: PageSchemaDefinition,
  input: QueryPageRowsInput,
): Result<PageViewConfiguration, PageViewNotFoundError | SchemaViewValidationError> => {
  if (input.viewName !== null) {
    const view = schema.views.find((candidate) => candidate.name === input.viewName);
    return view === undefined
      ? Result.fail(new PageViewNotFoundError())
      : Result.ok(readPageViewConfiguration(view.configuration));
  }
  const ownConfiguration = input.configuration ?? {};
  if (!pageViewConfigurationSchema.safeParse(ownConfiguration).success)
    return Result.fail(new SchemaViewValidationError('The filter or sort is not valid'));
  const configuration = readPageViewConfiguration(ownConfiguration);
  const unknown = findUnknownViewColumns(configuration, schema.properties);
  if (unknown.length === 0) return Result.ok(configuration);
  const known = schema.properties.map((property) => property.key).join(', ');
  return Result.fail(
    new SchemaViewValidationError(`The collection has no column ${unknown.join(', ')}. Its columns are: ${known}.`),
  );
};

@Injectable()
export class PageSchemaService {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pageRepository: PageRepositoryContract,
    @Inject(PAGE_SCHEMA_REPOSITORY) private readonly pageSchemaRepository: PageSchemaRepositoryContract,
  ) {}

  async defineSchema(
    input: DefinePageSchemaInput,
  ): Promise<Result<PageSchemaSummary, PageAccessDeniedError | PageSchemaChangedError | PageSchemaDefinitionError>> {
    if (input.role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const page = await this.pageRepository.getAccessible(input.pageId, input.workspaceId, input.userId, input.role);
    if (page === null) return Result.fail(new PageAccessDeniedError());
    const properties = validatePageSchemaDefinition(input.properties);
    if (properties.isFail()) return Result.fail(properties.getError());
    const views = validatePageSchemaViews(input.views, properties.getValue());
    if (views.isFail()) return Result.fail(views.getError());
    const schema = await this.pageSchemaRepository.defineSchema(
      input.pageId,
      { properties: properties.getValue(), views: views.getValue() },
      input.readShape,
    );
    if (schema === SCHEMA_CHANGED_MEANWHILE) return Result.fail(new PageSchemaChangedError());
    return Result.ok({ ...schema, spaceId: page.spaceId });
  }

  /** A schema diff cannot tell a rename from remove-and-add, which would orphan row values. */
  async rewriteOption(
    input: RewritePageOptionInput,
  ): Promise<Result<PageSchemaSummary, PageAccessDeniedError | SchemaPropertyDefinitionError>> {
    if (input.role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const page = await this.pageRepository.getAccessible(input.pageId, input.workspaceId, input.userId, input.role);
    if (page === null) return Result.fail(new PageAccessDeniedError());
    const schema = await this.pageSchemaRepository.getSchema(input.pageId);
    const rewritten = rewriteSchemaOption(schema.properties, {
      from: input.from,
      propertyKey: input.propertyKey,
      to: input.to,
    });
    if (rewritten.isFail()) return Result.fail(rewritten.getError());
    const written = await this.pageSchemaRepository.rewriteOption(
      input.pageId,
      input.propertyKey,
      { from: input.from, to: input.to },
      rewritten.getValue(),
    );
    // The option changed between read and write: fail instead of overwriting the other edit.
    if (written === SCHEMA_OPTION_ALREADY_MOVED) {
      return Result.fail(new SchemaPropertyDefinitionError({ from: input.from, propertyKey: input.propertyKey }));
    }
    return Result.ok({ ...written, spaceId: page.spaceId });
  }

  /** Avoids rewriting the whole collection per view tweak, which is costly and can lose concurrent edits. */
  async setViewConfiguration(
    input: SetPageViewConfigurationInput,
  ): Promise<Result<PageSchemaSummary, PageAccessDeniedError | PageViewNotFoundError | SchemaViewValidationError>> {
    if (input.role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const page = await this.pageRepository.getAccessible(input.pageId, input.workspaceId, input.userId, input.role);
    if (page === null) return Result.fail(new PageAccessDeniedError());
    const schema = await this.pageSchemaRepository.getSchema(input.pageId);
    const view = schema.views.find((candidate) => candidate.name === input.viewName);
    if (view === undefined) return Result.fail(new PageViewNotFoundError());
    const validated = validateSchemaView({ ...view, configuration: input.configuration }, schema.properties);
    if (validated.isFail()) return Result.fail(validated.getError());
    const written = await this.pageSchemaRepository.setViewConfiguration(
      input.pageId,
      input.viewName,
      input.configuration,
    );
    return Result.ok({ ...written, spaceId: page.spaceId });
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
    const found = await this.pageSchemaRepository.listRows(pageId, workspaceId, userId, role, COLLECTION_ROW_LIMIT);
    return Result.ok({ ...found, spaceId: page.spaceId });
  }

  /** A custom filter is validated like a view's and must name existing columns; missing ones are reported. */
  async queryRows(
    input: QueryPageRowsInput,
  ): Promise<
    Result<
      PageRowsSummary,
      PageAccessDeniedError | PageSchemaNotFoundError | PageViewNotFoundError | SchemaViewValidationError
    >
  > {
    const page = await this.pageRepository.getAccessible(input.pageId, input.workspaceId, input.userId, input.role);
    if (page === null) return Result.fail(new PageAccessDeniedError());
    const schema = await this.pageSchemaRepository.getSchema(input.pageId);
    if (!pageCarriesSchema(schema.properties)) return Result.fail(new PageSchemaNotFoundError());
    const configuration = resolveQueryConfiguration(schema, input);
    if (configuration.isFail()) return Result.fail(configuration.getError());
    const found = await this.pageSchemaRepository.listRows(
      input.pageId,
      input.workspaceId,
      input.userId,
      input.role,
      COLLECTION_QUERY_ROW_LIMIT,
    );
    return Result.ok({
      hasMore: found.hasMore,
      rows: listPageViewRowsInReadingOrder(configuration.getValue(), schema.properties, found.rows),
      spaceId: page.spaceId,
    });
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
    const { hasMore, rows } = await this.pageSchemaRepository.listRows(
      pageId,
      workspaceId,
      userId,
      role,
      COLLECTION_ROW_LIMIT,
    );
    const outcome = buildPageViewOutcome(view, schema.properties, rows);
    return Result.ok({
      hasMore,
      outcome,
      rowCount: countPageViewRows(outcome),
      spaceId: page.spaceId,
      totalRowCount: rows.length,
    });
  }
}
