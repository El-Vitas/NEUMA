import { isDeepStrictEqual } from 'node:util';
import { DatabasePropertyType, PageLifecycle } from '@company-brain/db';
import { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';
import { readPagePropertyOptionValues } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import type { SchemaPropertyDefinition } from '../../../../common/domain/schema.domain.types';
import { propertyValueMentions, rewritePropertyValues } from '../../../../common/domain/schema-option.domain';
import {
  parseSchemaPropertyValues,
  toSchemaPropertyDefinition,
  toSchemaViewDefinition,
} from '../../../../common/infrastructure/persistence/schema-json.adapter';
import { buildSpaceVisibilityFilter } from '../../../../common/infrastructure/persistence/space.visibility.filter';
import { WorkspaceMemberRepository } from '../../../../common/infrastructure/persistence/workspace-member.repository';
import { PrismaService } from '../../../../prisma/prisma.service';
import { SCHEMA_CHANGED_MEANWHILE, SCHEMA_OPTION_ALREADY_MOVED } from '../../constants/pages.constants';
import type {
  PageRowsPage,
  PageSchemaDefinition,
  PageSchemaRepositoryContract,
  PageSchemaShape,
} from '../../types/page-schema.types';

const schemaPropertySelection = {
  key: true,
  label: true,
  options: true,
  required: true,
  type: true,
} satisfies Prisma.PageSchemaPropertySelect;

const schemaViewSelection = {
  configuration: true,
  isDefault: true,
  name: true,
  type: true,
} satisfies Prisma.PageSchemaViewSelect;

const pageRowSelection = {
  id: true,
  lifecycle: true,
  order: true,
  parentId: true,
  propertyValues: true,
  spaceId: true,
  title: true,
} satisfies Prisma.PageSelect;

@Injectable()
export class PageSchemaRepository implements PageSchemaRepositoryContract {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceMemberRepository: WorkspaceMemberRepository,
  ) {}

  async resolveSchemaProperties(pageId: null | string): Promise<readonly SchemaPropertyDefinition[]> {
    if (pageId === null) return [];
    const properties = await this.prisma.pageSchemaProperty.findMany({
      orderBy: { order: 'asc' },
      select: schemaPropertySelection,
      where: { pageId },
    });
    return properties.map(toSchemaPropertyDefinition);
  }

  async listPersonPropertyKeys(pageIds: readonly string[]): Promise<ReadonlyMap<string, readonly string[]>> {
    if (pageIds.length === 0) return new Map();
    const properties = await this.prisma.pageSchemaProperty.findMany({
      orderBy: { order: 'asc' },
      select: { key: true, pageId: true },
      where: { pageId: { in: [...pageIds] }, type: DatabasePropertyType.PERSON },
    });
    const keysByPage = new Map<string, string[]>();
    for (const property of properties)
      keysByPage.set(property.pageId, [...(keysByPage.get(property.pageId) ?? []), property.key]);
    return keysByPage;
  }

  async getSchema(pageId: string): Promise<PageSchemaDefinition> {
    return this.loadSchemaSummary(this.prisma, pageId);
  }

  async defineSchema(
    pageId: string,
    { properties, views }: PageSchemaShape,
    readShape?: PageSchemaShape,
  ): Promise<PageSchemaDefinition | typeof SCHEMA_CHANGED_MEANWHILE> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "Page" WHERE "id" = ${pageId} FOR UPDATE`;
      if (readShape !== undefined && !(await this.isStillTheShape(transaction, pageId, readShape)))
        return SCHEMA_CHANGED_MEANWHILE;
      await transaction.pageSchemaProperty.deleteMany({ where: { pageId } });
      await transaction.pageSchemaView.deleteMany({ where: { pageId } });
      await transaction.pageSchemaProperty.createMany({
        data: properties.map((property, order) => ({
          key: property.key,
          label: property.label,
          options:
            property.options === null
              ? Prisma.JsonNull
              : property.options.map((option) => ({ color: option.color, value: option.value })),
          order,
          pageId,
          required: property.required,
          type: property.type,
        })),
      });
      await transaction.pageSchemaView.createMany({
        data: views.map((view, order) => ({
          configuration: view.configuration,
          isDefault: view.isDefault,
          name: view.name,
          order,
          pageId,
          type: view.type,
        })),
      });
      return this.loadSchemaSummary(transaction, pageId);
    });
  }

  /**
   * Reescribe la opción y arrastra consigo lo que las filas guardaron.
   *
   * Las dos cosas en una transacción: si la forma cambiara y las filas no, todas
   * las que decían el nombre viejo quedarían diciendo algo que la colección ya
   * no reconoce, y el tablero las dejaría sin columna.
   *
   * De qué nombre viene se comprueba aquí dentro, con la fila tomada: quien
   * pidió el cambio leyó las opciones hace un rato, y si en ese rato otra
   * persona tocó esa misma opción, escribir lo leído borraría su cambio. La
   * opción que ya no está donde se la dejó no se reescribe.
   */
  async rewriteOption(
    pageId: string,
    propertyKey: string,
    rename: { readonly from: string; readonly to: null | string },
    properties: readonly SchemaPropertyDefinition[],
  ): Promise<PageSchemaDefinition | typeof SCHEMA_OPTION_ALREADY_MOVED> {
    return this.prisma.$transaction(async (transaction) => {
      const held = await transaction.$queryRaw<{ options: unknown }[]>`
        SELECT "options" FROM "PageSchemaProperty" WHERE "pageId" = ${pageId} AND "key" = ${propertyKey} FOR UPDATE
      `;
      const stillThere = readPagePropertyOptionValues(held[0]?.options)?.includes(rename.from) ?? false;
      if (!stillThere) return SCHEMA_OPTION_ALREADY_MOVED;
      const rewritten = properties.find((property) => property.key === propertyKey);
      await transaction.pageSchemaProperty.updateMany({
        data: {
          options:
            rewritten?.options === null || rewritten?.options === undefined
              ? Prisma.JsonNull
              : rewritten.options.map((option) => ({ color: option.color, value: option.value })),
        },
        where: { key: propertyKey, pageId },
      });
      /* Las filas se leen tomadas, como al cambiar una sola: una tarjeta movida entretanto no vuelve a su columna vieja. */
      const rows = await transaction.$queryRaw<{ id: string; propertyValues: Prisma.JsonValue }[]>`
        SELECT "id", "propertyValues" FROM "Page"
        WHERE "parentId" = ${pageId} AND "propertyValues" IS NOT NULL
        FOR UPDATE
      `;
      for (const row of rows) {
        const stored = parseSchemaPropertyValues(row.propertyValues);
        if (stored === null || !propertyValueMentions(stored[propertyKey], rename.from)) continue;
        await transaction.page.update({
          data: { propertyValues: rewritePropertyValues(stored, propertyKey, rename.from, rename.to) },
          where: { id: row.id },
        });
      }
      return this.loadSchemaSummary(transaction, pageId);
    });
  }

  /**
   * Cambia lo que una vista dice de sí misma, y nada más.
   *
   * Rehacer la forma entera para esto borraría y volvería a crear cada propiedad
   * y cada vista de la colección: mucho trabajo, y una ventana donde el cambio
   * de otra persona se perdería, por doblar una franja.
   */
  async setViewConfiguration(
    pageId: string,
    viewName: string,
    configuration: Prisma.InputJsonObject,
  ): Promise<PageSchemaDefinition> {
    await this.prisma.pageSchemaView.updateMany({ data: { configuration }, where: { name: viewName, pageId } });
    return this.loadSchemaSummary(this.prisma, pageId);
  }

  async listRows(
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    limit: number,
  ): Promise<PageRowsPage> {
    /* Una de más que el tope: es lo que distingue una colección que cabe justa de una a la que se le cortó la cola. */
    const found = await this.prisma.page.findMany({
      orderBy: { order: 'asc' },
      select: pageRowSelection,
      take: limit + 1,
      where: {
        lifecycle: PageLifecycle.ACTIVE,
        parentId: pageId,
        space: { workspaceId, ...buildSpaceVisibilityFilter(userId, role) },
      },
    });
    return {
      hasMore: found.length > limit,
      rows: found.slice(0, limit).map((row) => ({
        id: row.id,
        lifecycle: row.lifecycle,
        order: row.order,
        parentId: row.parentId,
        propertyValues: parseSchemaPropertyValues(row.propertyValues),
        spaceId: row.spaceId,
        title: row.title,
      })),
    };
  }

  async listWorkspaceMemberIds(workspaceId: string): Promise<readonly string[]> {
    return this.workspaceMemberRepository.listActiveMemberIds(workspaceId);
  }

  /** Si la forma guardada sigue siendo la que se leyó: mismas columnas y mismas vistas, en el mismo orden. */
  private async isStillTheShape(
    transaction: Prisma.TransactionClient,
    pageId: string,
    readShape: PageSchemaShape,
  ): Promise<boolean> {
    const current = await this.loadSchemaSummary(transaction, pageId);
    return isDeepStrictEqual(
      { properties: current.properties, views: current.views },
      { properties: readShape.properties, views: readShape.views },
    );
  }

  private async loadSchemaSummary(
    client: Pick<Prisma.TransactionClient, 'pageSchemaProperty' | 'pageSchemaView'>,
    pageId: string,
  ): Promise<PageSchemaDefinition> {
    const [properties, views] = await Promise.all([
      client.pageSchemaProperty.findMany({
        orderBy: { order: 'asc' },
        select: schemaPropertySelection,
        where: { pageId },
      }),
      /**
       * En el orden que les dio quien configuró la colección, que es el de sus
       * pestañas. Leerlas por nombre haría que renombrar una vista la moviera de
       * sitio, y dejaría el orden en manos del alfabeto.
       */
      client.pageSchemaView.findMany({
        orderBy: { order: 'asc' },
        select: schemaViewSelection,
        where: { pageId },
      }),
    ]);
    return {
      pageId,
      properties: properties.map(toSchemaPropertyDefinition),
      views: views.flatMap((view) => {
        const definition = toSchemaViewDefinition(view);
        return definition === null ? [] : [definition];
      }),
    };
  }
}
