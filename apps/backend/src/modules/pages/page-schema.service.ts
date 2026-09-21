import { Result, USER_ROLE, type UserRole } from '@company-brain/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { SchemaViewValidationError } from '../../common/domain/schema.error';
import { SchemaPropertyDefinitionError } from '../../common/domain/schema.error';
import { rewriteSchemaOption } from '../../common/domain/schema-option.domain';
import { validateSchemaView } from '../../common/domain/schema-view.domain';
import { PAGE_REPOSITORY, PAGE_SCHEMA_REPOSITORY, SCHEMA_OPTION_ALREADY_MOVED } from './constants/pages.constants';
import {
  PageAccessDeniedError,
  type PageSchemaDefinitionError,
  PageSchemaNotFoundError,
  PageViewNotFoundError,
} from './domain/page.error';
import { pageCarriesSchema, validatePageSchemaDefinition, validatePageSchemaViews } from './domain/page-schema.domain';
import { buildPageViewOutcome, countPageViewRows } from './domain/page-view.domain';
import type { PageRepositoryContract } from './types/page.types';
import type {
  DefinePageSchemaInput,
  PageRowsSummary,
  PageSchemaRepositoryContract,
  PageSchemaSummary,
  RewritePageOptionInput,
  SetPageViewConfigurationInput,
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

  /**
   * Le cambia el nombre a una opción, o la quita: en un tablero, renombrar o
   * borrar una columna.
   *
   * Es una operación y no un cambio más de la forma porque la forma sola no
   * distingue un renombrado de un quitar y poner: sin decir de qué nombre viene,
   * las filas que respondían lo viejo se quedarían huérfanas.
   */
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
    /* Otra persona tocó esa misma opción entre que se leyó y se fue a escribir: se deshace en vez de borrarle el cambio. */
    if (written === SCHEMA_OPTION_ALREADY_MOVED) {
      return Result.fail(new SchemaPropertyDefinitionError({ from: input.from, propertyKey: input.propertyKey }));
    }
    return Result.ok({ ...written, spaceId: page.spaceId });
  }

  /**
   * Cambia lo que una vista dice de sí misma: por qué agrupa, qué filtra, qué
   * calcula, cómo se la está mirando.
   *
   * Va aparte de definir la forma porque no la toca. Guardar esto reescribiendo
   * la colección entera hace caro un gesto —doblar una franja, mover un borde—
   * y deja una ventana donde lo que otra persona acaba de cambiar en otra
   * propiedad se pierde.
   */
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
    const found = await this.pageSchemaRepository.listRows(pageId, workspaceId, userId, role);
    return Result.ok({ ...found, spaceId: page.spaceId });
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
    const { hasMore, rows } = await this.pageSchemaRepository.listRows(pageId, workspaceId, userId, role);
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
