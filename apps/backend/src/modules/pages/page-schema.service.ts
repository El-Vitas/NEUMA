import { Inject, Injectable } from '@nestjs/common';
import { DatabasePropertyType, PageLifecycle } from '@neuma/db';
import {
  DEFAULT_PAGE_PROPERTY_CONFIG,
  isPageComputedPropertyType,
  Result,
  USER_ROLE,
  type UserRole,
} from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../common/domain/schema.domain.types';
import { SchemaPropertyDefinitionError } from '../../common/domain/schema.error';
import { findOptionReplacement, rewriteSchemaOption } from '../../common/domain/schema-option.domain';
import { generateOptionId } from '../../common/utils/option-id.utils';
import {
  PAGE_REPOSITORY,
  PAGE_SCHEMA_REPOSITORY,
  PREVIEW_PROPERTY_KEY,
  REACHABLE_COLLECTIONS_LIMIT,
  SCHEMA_CHANGED_MEANWHILE,
  SCHEMA_OPTION_ALREADY_MOVED,
} from './constants/pages.constants';
import {
  PageAccessDeniedError,
  PageLifecycleError,
  PageLockedError,
  PageSchemaChangedError,
  type PageSchemaDefinitionError,
} from './domain/page.error';
import {
  listForeignRollupTargetIds,
  listOwnRollupTargetIds,
  planComputedProperties,
} from './domain/page-computed-schema.domain';
import { planRelationChanges } from './domain/page-relation-schema.domain';
import {
  pageCarriesSchema,
  resolveSchemaDrafts,
  validatePageSchemaDefinition,
  validatePageSchemaViews,
} from './domain/page-schema.domain';
import type { PageSchemaSideEffects, RelationPlan } from './domain/page-schema.domain.types';
import type { PageRepositoryContract, PageSummary } from './types/page.types';
import type {
  DefinePageSchemaInput,
  PageSchemaRepositoryContract,
  PageSchemaSummary,
  PreviewComputedInput,
  PreviewedSchema,
  RewritePageOptionInput,
} from './types/page-schema.types';

@Injectable()
export class PageSchemaService {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pageRepository: PageRepositoryContract,
    @Inject(PAGE_SCHEMA_REPOSITORY) private readonly pageSchemaRepository: PageSchemaRepositoryContract,
  ) {}

  async defineSchema(
    input: DefinePageSchemaInput,
  ): Promise<
    Result<
      PageSchemaSummary,
      PageAccessDeniedError | PageLifecycleError | PageLockedError | PageSchemaChangedError | PageSchemaDefinitionError
    >
  > {
    const editable = await this.requireEditableCollection(input);
    if (editable.isFail()) return Result.fail(editable.getError());
    const page = editable.getValue();
    const stored = await this.pageSchemaRepository.getSchema(input.pageId);
    const resolved = resolveSchemaDrafts(input.properties, stored.properties, generateOptionId);
    const planned = await this.planRelations(input, page, stored.properties, resolved);
    if (planned.isFail()) return Result.fail(planned.getError());
    const mirrorsEditable = await this.canEditMirrorTargets(input, planned.getValue().sideEffects);
    if (!mirrorsEditable) return Result.fail(new PageAccessDeniedError());
    const computed = await this.planComputed(input, page, stored.properties, planned.getValue().definitions);
    if (computed.isFail()) return Result.fail(computed.getError());
    const properties = validatePageSchemaDefinition(computed.getValue());
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

  /**
   * The schema as it would be with one more formula or rollup, planned by the same rules that save one but saving
   * nothing: it tells what the computed column would produce, or why it would be refused.
   */
  async previewComputed(
    input: PreviewComputedInput,
  ): Promise<Result<PreviewedSchema, PageAccessDeniedError | PageSchemaDefinitionError>> {
    if (input.role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const page = await this.pageRepository.getAccessible(input.pageId, input.workspaceId, input.userId, input.role);
    if (page === null) return Result.fail(new PageAccessDeniedError());
    const stored = await this.pageSchemaRepository.getSchema(input.pageId);
    const isFormula = input.computedDraft.formula !== null;
    const previewed: SchemaPropertyDefinition = {
      config: DEFAULT_PAGE_PROPERTY_CONFIG,
      key: PREVIEW_PROPERTY_KEY,
      label: PREVIEW_PROPERTY_KEY,
      options: null,
      required: false,
      type: isFormula ? DatabasePropertyType.FORMULA : DatabasePropertyType.ROLLUP,
    };
    const definitions = [...stored.properties, previewed];
    const drafts = definitions.map((property) => ({
      ...property,
      computedDraft: property.key === PREVIEW_PROPERTY_KEY ? input.computedDraft : null,
      twoWay: false,
    }));
    const planned = await this.planComputed(
      { ...input, properties: drafts, views: [] },
      page,
      stored.properties,
      definitions,
    );
    return planned.isFail()
      ? Result.fail(planned.getError())
      : Result.ok({ properties: planned.getValue(), spaceId: page.spaceId });
  }

  /** A schema diff cannot tell a rename from remove-and-add, which would orphan row values. */
  async rewriteOption(
    input: RewritePageOptionInput,
  ): Promise<
    Result<
      PageSchemaSummary,
      PageAccessDeniedError | PageLifecycleError | PageLockedError | SchemaPropertyDefinitionError
    >
  > {
    const editable = await this.requireEditableCollection(input);
    if (editable.isFail()) return Result.fail(editable.getError());
    const page = editable.getValue();
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

  /** The collections of a space that the caller can open, which is what a relation may point to. */
  async listCollections(
    spaceId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ): Promise<readonly { readonly id: string; readonly title: string }[]> {
    const collectionIds = await this.pageSchemaRepository.listCollectionIdsInSpace(spaceId);
    const pages = await this.pageRepository.listAccessibleAmong(spaceId, collectionIds, workspaceId, userId, role);
    return pages.map((page) => ({ id: page.id, title: page.title }));
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

  /** Changing a schema is an edit of the collection: reading is not enough, and a locked or trashed one stays. */
  private async requireEditableCollection(input: {
    readonly pageId: string;
    readonly role: UserRole;
    readonly userId: string;
    readonly workspaceId: string;
  }): Promise<Result<PageSummary, PageAccessDeniedError | PageLifecycleError | PageLockedError>> {
    if (input.role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const page = await this.pageRepository.getEditable(input.pageId, input.workspaceId, input.userId, input.role);
    if (page === null) return Result.fail(new PageAccessDeniedError());
    if (page.lifecycle !== PageLifecycle.ACTIVE) return Result.fail(new PageLifecycleError());
    if (page.lockedAt !== null) return Result.fail(new PageLockedError());
    return Result.ok(page);
  }

  /** A mirror is added to, or let go from, the other collection: the caller must be able to edit that one too. */
  private async canEditMirrorTargets(
    input: { readonly role: UserRole; readonly userId: string; readonly workspaceId: string },
    sideEffects: PageSchemaSideEffects,
  ): Promise<boolean> {
    const targetIds = new Set([
      ...sideEffects.mirrorsToCreate.map((mirror) => mirror.targetCollectionId),
      ...sideEffects.mirrorsToUnlink.map((mirror) => mirror.collectionId),
    ]);
    const editable = await Promise.all(
      [...targetIds].map((targetId) =>
        this.pageRepository.getEditable(targetId, input.workspaceId, input.userId, input.role),
      ),
    );
    return editable.every((target) => target !== null);
  }

  /**
   * Formulas and rollups are read against what they reach: the related collections of the rollups (the ones the
   * caller names must be openable and in the same space) and, further on, the collections those rollups read.
   */
  private async planComputed(
    input: DefinePageSchemaInput,
    page: { readonly spaceId: string },
    stored: readonly SchemaPropertyDefinition[],
    definitions: readonly SchemaPropertyDefinition[],
  ): Promise<Result<readonly SchemaPropertyDefinition[], PageSchemaDefinitionError>> {
    const hasComputed = definitions.some((property) => isPageComputedPropertyType(property.type));
    const collections = hasComputed ? await this.loadReachableCollections(input, page, stored, definitions) : new Map();
    return planComputedProperties({
      collectionId: input.pageId,
      collections,
      definitions,
      dependents: await this.pageSchemaRepository.listRollupDependents(input.pageId),
      drafts: input.properties,
      stored,
    });
  }

  private async loadReachableCollections(
    input: DefinePageSchemaInput,
    page: { readonly spaceId: string },
    stored: readonly SchemaPropertyDefinition[],
    definitions: readonly SchemaPropertyDefinition[],
  ): Promise<ReadonlyMap<string, readonly SchemaPropertyDefinition[]>> {
    const loaded = new Map<string, readonly SchemaPropertyDefinition[]>();
    const pending = listOwnRollupTargetIds(definitions, stored, input.properties).map((id) => ({ id, isNamed: true }));
    for (let entry = pending.shift(); entry !== undefined; entry = pending.shift()) {
      if (entry.id === input.pageId || loaded.has(entry.id) || loaded.size >= REACHABLE_COLLECTIONS_LIMIT) continue;
      if (entry.isNamed && !(await this.canRelate(input, page, entry.id))) continue;
      const schema = (await this.pageSchemaRepository.getSchema(entry.id)).properties;
      if (!pageCarriesSchema(schema)) continue;
      loaded.set(entry.id, schema);
      pending.push(...listForeignRollupTargetIds(schema).map((id) => ({ id, isNamed: false })));
    }
    return loaded;
  }

  private async canRelate(
    input: DefinePageSchemaInput,
    page: { readonly spaceId: string },
    targetId: string,
  ): Promise<boolean> {
    const target = await this.pageRepository.getAccessible(targetId, input.workspaceId, input.userId, input.role);
    return target?.spaceId === page.spaceId;
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
      if (target?.spaceId !== page.spaceId) continue;
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
}
