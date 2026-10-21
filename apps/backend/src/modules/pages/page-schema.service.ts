import { Inject, Injectable } from '@nestjs/common';
import { DatabasePropertyType } from '@neuma/db';
import {
  type PageViewConfiguration,
  pageViewConfigurationSchema,
  Result,
  readPageViewConfiguration,
  USER_ROLE,
  type UserRole,
} from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../common/domain/schema.domain.types';
import { SchemaPropertyDefinitionError, SchemaViewValidationError } from '../../common/domain/schema.error';
import { findOptionReplacement, rewriteSchemaOption } from '../../common/domain/schema-option.domain';
import { validateSchemaView } from '../../common/domain/schema-view.domain';
import { generateOptionId } from '../../common/utils/option-id.utils';
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
import { planRelationChanges } from './domain/page-relation-schema.domain';
import {
  pageCarriesSchema,
  resolveSchemaDrafts,
  validatePageSchemaDefinition,
  validatePageSchemaViews,
} from './domain/page-schema.domain';
import type { RelationPlan } from './domain/page-schema.domain.types';
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
    const stored = await this.pageSchemaRepository.getSchema(input.pageId);
    const resolved = resolveSchemaDrafts(input.properties, stored.properties, generateOptionId);
    const planned = await this.planRelations(input, page, stored.properties, resolved);
    if (planned.isFail()) return Result.fail(planned.getError());
    const properties = validatePageSchemaDefinition(planned.getValue().definitions);
    if (properties.isFail()) return Result.fail(properties.getError());
    const views = validatePageSchemaViews(input.views, properties.getValue());
    if (views.isFail()) return Result.fail(views.getError());
    const schema = await this.pageSchemaRepository.defineSchema(
      input.pageId,
      { properties: properties.getValue(), views: views.getValue() },
      input.readShape,
      planned.getValue().sideEffects,
      { role: input.role, userId: input.userId, workspaceId: input.workspaceId },
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
      optionId: input.optionId,
      propertyKey: input.propertyKey,
      to: input.to,
    });
    if (rewritten.isFail()) return Result.fail(rewritten.getError());
    const property = schema.properties.find((candidate) => candidate.key === input.propertyKey);
    const written = await this.pageSchemaRepository.rewriteOption(
      input.pageId,
      input.propertyKey,
      {
        optionId: input.optionId,
        replacementId: property === undefined ? null : findOptionReplacement(property, input.optionId),
        to: input.to,
      },
      rewritten.getValue(),
      { role: input.role, userId: input.userId, workspaceId: input.workspaceId },
    );
    // The option changed between read and write: fail instead of overwriting the other edit.
    if (written === SCHEMA_OPTION_ALREADY_MOVED) {
      return Result.fail(
        new SchemaPropertyDefinitionError({ optionId: input.optionId, propertyKey: input.propertyKey }),
      );
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

  /** The collections of a space that the caller can open, which is what a relation may point to. */
  async listCollections(
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly { readonly id: string; readonly title: string }[]> {
    const pages = await this.pageRepository.listAccessible(spaceId, workspaceId, userId, role, false);
    const collectionIds = await this.pageSchemaRepository.findCollectionIds(pages.map((page) => page.id));
    return pages.filter((page) => collectionIds.has(page.id)).map((page) => ({ id: page.id, title: page.title }));
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
      attachedFiles: found.attachedFiles,
      hasMore: found.hasMore,
      relatedRows: found.relatedRows,
      rows: listPageViewRowsInReadingOrder(configuration.getValue(), schema.properties, found.rows),
      spaceId: page.spaceId,
    });
  }

  /** The targets of the relations the caller asks for must be collections the caller can open, in the same space. */
  private async planRelations(
    input: DefinePageSchemaInput,
    page: { readonly spaceId: string; readonly title: string },
    stored: readonly SchemaPropertyDefinition[],
    definitions: readonly SchemaPropertyDefinition[],
  ): Promise<Result<RelationPlan, PageSchemaDefinitionError>> {
    const targetIds = [
      ...new Set(
        definitions.flatMap((property) =>
          property.type === DatabasePropertyType.RELATION && property.config.targetCollectionId !== null
            ? [property.config.targetCollectionId]
            : [],
        ),
      ),
    ];
    const targetSchemas = new Map<string, readonly SchemaPropertyDefinition[]>();
    for (const targetId of targetIds) {
      const target = await this.pageRepository.getAccessible(targetId, input.workspaceId, input.userId, input.role);
      if (target === null || target.spaceId !== page.spaceId) continue;
      const schema = await this.pageSchemaRepository.getSchema(targetId);
      if (pageCarriesSchema(schema.properties)) targetSchemas.set(targetId, schema.properties);
    }
    return planRelationChanges({
      collectionTitle: page.title,
      definitions,
      pageId: input.pageId,
      stored,
      targetSchemas,
      twoWayKeys: new Set(input.properties.filter((property) => property.twoWay).map((property) => property.key)),
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
    const { attachedFiles, hasMore, relatedRows, rows } = await this.pageSchemaRepository.listRows(
      pageId,
      workspaceId,
      userId,
      role,
      COLLECTION_ROW_LIMIT,
    );
    const outcome = buildPageViewOutcome(view, schema.properties, rows);
    return Result.ok({
      attachedFiles,
      hasMore,
      relatedRows,
      outcome,
      rowCount: countPageViewRows(outcome),
      spaceId: page.spaceId,
      totalRowCount: rows.length,
    });
  }
}
