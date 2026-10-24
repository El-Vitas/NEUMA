import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DatabasePropertyType } from '@neuma/db';
import {
  findInvalidPageTemplateVariable,
  givePageBlocksTheirIds,
  isPagePropertySystemManaged,
  PAGE_TEMPLATE_MAXIMUM_PER_COLLECTION,
  type PageTemplateVariables,
  Result,
  readPageDefaultTemplateId,
  readPageTemplate,
  USER_ROLE,
} from '@neuma/shared';
import { readBlockTitle } from '../../common/domain/block-access.domain';
import type { SchemaPropertyDefinition, SchemaPropertyValues } from '../../common/domain/schema.domain.types';
import { PAGE_EMPTY_CONTENT, PAGE_REPOSITORY, PAGE_SCHEMA_REPOSITORY } from './constants/pages.constants';
import { readPageValues } from './domain/page.block.domain';
import { validatePageContent } from './domain/page.domain';
import {
  PageAccessDeniedError,
  PageContentValidationError,
  PagePropertyValidationError,
  PageSchemaNotFoundError,
  PageTemplateInvalidError,
  PageTemplateLimitError,
  PageTemplateNotFoundError,
} from './domain/page.error';
import { buildTemplateMarkerOperation } from './domain/page.operation.domain';
import {
  checkValuesAreWritableHere,
  listFileIds,
  pageCarriesSchema,
  validatePageProperties,
} from './domain/page-schema.domain';
import { PageTemplateRepository } from './infrastructure/persistence/page.template.repository';
import type { AccessiblePage } from './types/page.block.types';
import type { PageRepositoryContract } from './types/page.types';
import type { PageSchemaRepositoryContract } from './types/page-schema.types';
import type {
  PageTemplateActor,
  PageTemplateCollection,
  PageTemplateDraft,
  PageTemplateFailure,
  PageTemplateListing,
  PageTemplateSummary,
} from './types/page-template.types';

const toSummary = (page: AccessiblePage, defaultTemplateId: null | string): PageTemplateSummary => ({
  id: page.block.id,
  isDefault: page.block.id === defaultTemplateId,
  propertyValues: readPageValues(page.block.properties) ?? {},
  title: readBlockTitle(page.block.properties),
  variables: readPageTemplate(page.block.properties)?.variables ?? {},
});

const withoutVariableKeys = (
  values: Readonly<Record<string, unknown>>,
  variables: PageTemplateVariables,
): Record<string, unknown> => Object.fromEntries(Object.entries(values).filter(([key]) => !(key in variables)));

/** Templates of a collection (ADR 027): pages kept beside its rows, copied into a new row on demand. */
@Injectable()
export class PageTemplateService {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pageRepository: PageRepositoryContract,
    @Inject(PAGE_SCHEMA_REPOSITORY) private readonly schemaRepository: PageSchemaRepositoryContract,
    private readonly templateRepository: PageTemplateRepository,
  ) {}

  async list(
    collectionId: string,
    actor: PageTemplateActor,
  ): Promise<Result<PageTemplateListing, PageAccessDeniedError>> {
    const collection = await this.templateRepository.findCollection(collectionId, actor);
    if (collection === null) return Result.fail(new PageAccessDeniedError());
    const defaultTemplateId = readPageDefaultTemplateId(collection.block.properties);
    const templates = await this.templateRepository.listTemplates(collectionId, actor);
    return Result.ok({
      defaultTemplateId: templates.some(({ block }) => block.id === defaultTemplateId) ? defaultTemplateId : null,
      templates: templates.map((page) => toSummary(page, defaultTemplateId)),
    });
  }

  async create(
    collectionId: string,
    draft: PageTemplateDraft,
    actor: PageTemplateActor,
  ): Promise<Result<PageTemplateSummary, PageTemplateFailure>> {
    const context = await this.openCollection(collectionId, actor);
    if (context.isFail()) return Result.fail(context.getError());
    const { collection, columns } = context.getValue();
    const existing = await this.templateRepository.listTemplates(collectionId, actor);
    if (existing.length >= PAGE_TEMPLATE_MAXIMUM_PER_COLLECTION) {
      return Result.fail(new PageTemplateLimitError(PAGE_TEMPLATE_MAXIMUM_PER_COLLECTION));
    }
    const content = validatePageContent(draft.content ?? PAGE_EMPTY_CONTENT);
    if (content.isFail()) return Result.fail(content.getError());
    const variables = draft.variables ?? {};
    const values = await this.validateValues(columns, draft, variables, {}, actor);
    if (values.isFail()) return Result.fail(values.getError());
    const created = await this.pageRepository.create({
      content: givePageBlocksTheirIds(content.getValue(), randomUUID),
      createdById: actor.userId,
      parentId: collectionId,
      propertyValues: values.getValue(),
      role: actor.role,
      spaceId: collection.block.spaceId,
      template: { variables },
      title: draft.title ?? '',
      userId: actor.userId,
      workspaceId: actor.workspaceId,
    });
    if (created === null) return Result.fail(new PageAccessDeniedError());
    if (draft.isDefault === true) {
      const marked = await this.setDefault(collectionId, created.id, actor);
      if (marked.isFail()) return Result.fail(marked.getError());
    }
    return Result.ok({
      id: created.id,
      isDefault: draft.isDefault === true,
      propertyValues: values.getValue() ?? {},
      title: created.title,
      variables,
    });
  }

  async update(
    collectionId: string,
    templateId: string,
    draft: PageTemplateDraft,
    actor: PageTemplateActor,
  ): Promise<Result<PageTemplateSummary, PageTemplateFailure>> {
    const context = await this.openCollection(collectionId, actor);
    if (context.isFail()) return Result.fail(context.getError());
    const { collection, columns } = context.getValue();
    const template = await this.templateRepository.findTemplate(collectionId, templateId, actor);
    if (template === null) return Result.fail(new PageTemplateNotFoundError());
    const current = toSummary(template, readPageDefaultTemplateId(collection.block.properties));
    const variables = draft.variables ?? current.variables;
    const values = await this.validateValues(
      columns,
      { ...draft, title: draft.title ?? current.title },
      variables,
      current.propertyValues,
      actor,
    );
    if (values.isFail()) return Result.fail(values.getError());
    const wanted = values.getValue() ?? {};
    const written = await this.pageRepository.updatePropertyValues(
      {
        extraOperations: [buildTemplateMarkerOperation(templateId, { variables })],
        pageId: templateId,
        role: actor.role,
        updatedById: actor.userId,
        workspaceId: actor.workspaceId,
        ...(draft.title === undefined ? {} : { title: draft.title }),
      },
      () => Result.ok<SchemaPropertyValues | null>(wanted),
    );
    if (written === null || written.isFail()) return Result.fail(new PageAccessDeniedError());
    const contentFailure = await this.rewriteContent(draft, templateId, collection, actor);
    if (contentFailure !== null) return Result.fail(contentFailure);
    if (draft.isDefault !== undefined) {
      const marked = await this.setDefault(collectionId, draft.isDefault ? templateId : null, actor);
      if (marked.isFail()) return Result.fail(marked.getError());
    }
    return Result.ok({
      id: templateId,
      isDefault: draft.isDefault ?? current.isDefault,
      propertyValues: wanted,
      title: draft.title ?? current.title,
      variables,
    });
  }

  /** The template goes to the trash with a deadline, like a page deleted for good; the default is cleared first. */
  async delete(
    collectionId: string,
    templateId: string,
    actor: PageTemplateActor,
  ): Promise<Result<true, PageAccessDeniedError | PageTemplateNotFoundError>> {
    if (actor.role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const collection = await this.templateRepository.findCollection(collectionId, actor);
    if (collection === null) return Result.fail(new PageAccessDeniedError());
    const template = await this.templateRepository.findTemplate(collectionId, templateId, actor);
    if (template === null) return Result.fail(new PageTemplateNotFoundError());
    if (readPageDefaultTemplateId(collection.block.properties) === templateId) {
      const cleared = await this.setDefault(collectionId, null, actor);
      if (cleared.isFail()) return Result.fail(cleared.getError());
    }
    const isTrashed = await this.pageRepository.trashCascade(
      templateId,
      actor.userId,
      actor.workspaceId,
      actor.role,
      randomUUID(),
    );
    if (!isTrashed) return Result.fail(new PageAccessDeniedError());
    return Result.ok(true);
  }

  async setDefault(
    collectionId: string,
    templateId: null | string,
    actor: PageTemplateActor,
  ): Promise<Result<PageTemplateListing, PageAccessDeniedError | PageTemplateNotFoundError>> {
    if (actor.role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const collection = await this.templateRepository.findCollection(collectionId, actor);
    if (collection === null) return Result.fail(new PageAccessDeniedError());
    if (templateId !== null && (await this.templateRepository.findTemplate(collectionId, templateId, actor)) === null) {
      return Result.fail(new PageTemplateNotFoundError());
    }
    const written = await this.pageRepository.setDefaultTemplate(
      collectionId,
      templateId,
      actor.userId,
      actor.workspaceId,
      actor.role,
    );
    if (written === null) return Result.fail(new PageAccessDeniedError());
    return this.list(collectionId, actor);
  }

  private async openCollection(
    collectionId: string,
    actor: PageTemplateActor,
  ): Promise<Result<PageTemplateCollection, PageAccessDeniedError | PageSchemaNotFoundError>> {
    if (actor.role === USER_ROLE.CLIENT) return Result.fail(new PageAccessDeniedError());
    const collection = await this.templateRepository.findCollection(collectionId, actor);
    if (collection === null) return Result.fail(new PageAccessDeniedError());
    const columns = await this.schemaRepository.resolveSchemaProperties(collectionId);
    if (!pageCarriesSchema(columns)) return Result.fail(new PageSchemaNotFoundError());
    return Result.ok({ collection, columns });
  }

  /** Values a template may keep: known columns, nothing the server fills, no relation, no file. */
  private async validateValues(
    columns: readonly SchemaPropertyDefinition[],
    draft: PageTemplateDraft,
    variables: PageTemplateVariables,
    current: Readonly<Record<string, unknown>>,
    actor: PageTemplateActor,
  ): Promise<Result<SchemaPropertyValues | null, PagePropertyValidationError | PageTemplateInvalidError>> {
    const invalidVariable = findInvalidPageTemplateVariable(variables, columns);
    if (invalidVariable !== null) return Result.fail(new PageTemplateInvalidError(invalidVariable));
    const wanted = withoutVariableKeys(draft.propertyValues ?? current, variables);
    const managed = columns.find((column) => isPagePropertySystemManaged(column.type) && column.key in wanted);
    if (managed !== undefined) {
      return Result.fail(
        new PagePropertyValidationError(`${managed.key} is filled by Neuma and cannot be in a template`),
      );
    }
    const writable = checkValuesAreWritableHere(columns, wanted);
    if (writable.isFail()) return Result.fail(writable.getError());
    if (listFileIds(columns, wanted).length > 0) {
      return Result.fail(new PagePropertyValidationError('A template cannot hold files: they belong to one page'));
    }
    const personIds = columns.some((column) => column.type === DatabasePropertyType.PERSON)
      ? new Set(await this.schemaRepository.listWorkspaceMemberIds(actor.workspaceId))
      : undefined;
    return validatePageProperties(columns, draft.title ?? 'Template', wanted, {
      personIds,
      written: Object.keys(wanted),
    });
  }

  private async rewriteContent(
    draft: PageTemplateDraft,
    templateId: string,
    collection: AccessiblePage,
    actor: PageTemplateActor,
  ): Promise<PageContentValidationError | PageAccessDeniedError | null> {
    if (draft.content === undefined) return null;
    const content = validatePageContent(draft.content);
    if (content.isFail()) return content.getError();
    const written = await this.pageRepository.writeContent(
      {
        pageId: templateId,
        role: actor.role,
        spaceId: collection.block.spaceId,
        userId: actor.userId,
        workspaceId: actor.workspaceId,
      },
      () => content.getValue(),
    );
    return written === null ? new PageAccessDeniedError() : null;
  }
}
