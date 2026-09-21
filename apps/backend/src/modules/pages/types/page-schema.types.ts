import type { PageLifecycle } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';
import type {
  SchemaPropertyDefinition,
  SchemaPropertyValues,
  SchemaViewDefinition,
} from '../../../common/domain/schema.domain.types';
import type { SCHEMA_OPTION_ALREADY_MOVED } from '../constants/pages.constants';

export type {
  SchemaPropertyDefinition,
  SchemaPropertyValue,
  SchemaPropertyValues,
  SchemaViewDefinition,
} from '../../../common/domain/schema.domain.types';

export interface PageSchemaDefinition {
  readonly pageId: string;
  readonly properties: readonly SchemaPropertyDefinition[];
  readonly views: readonly SchemaViewDefinition[];
}

export interface PageSchemaSummary extends PageSchemaDefinition {
  readonly spaceId: string;
}

export interface DefinePageSchemaInput {
  readonly pageId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: UserRole;
  readonly properties: readonly SchemaPropertyDefinition[];
  readonly views: readonly SchemaViewDefinition[];
}

export interface PageRowSummary {
  readonly id: string;
  readonly parentId: null | string;
  readonly spaceId: string;
  readonly title: string;
  readonly propertyValues: SchemaPropertyValues | null;
  readonly order: number;
  readonly lifecycle: PageLifecycle;
}

/**
 * Las filas que se trajeron, y si la colección guardaba más de las que caben.
 *
 * Las dos cosas viajan juntas porque una lista cortada sin decirlo se lee como
 * la colección entera.
 */
export interface PageRowsPage {
  readonly hasMore: boolean;
  readonly rows: readonly PageRowSummary[];
}

export interface PageRowsSummary {
  readonly hasMore: boolean;
  readonly spaceId: string;
  readonly rows: readonly PageRowSummary[];
}

/**
 * Lo que una vista dice de sí misma: por qué agrupa, qué filtra, qué calcula,
 * cómo se la está mirando.
 *
 * Va por su propio camino porque no toca ni la forma de la colección ni sus
 * otras vistas: mandar el esquema entero para doblar una franja reescribe cada
 * propiedad y cada vista de la colección, y hace caro lo que es un gesto.
 */
export interface SetPageViewConfigurationInput {
  readonly configuration: Prisma.InputJsonObject;
  readonly pageId: string;
  readonly role: UserRole;
  readonly userId: string;
  readonly viewName: string;
  readonly workspaceId: string;
}

/** Sin nombre nuevo, la columna se quita y sus filas se quedan sin valor. */
export interface RewritePageOptionInput {
  readonly from: string;
  readonly pageId: string;
  readonly propertyKey: string;
  readonly role: UserRole;
  readonly to: null | string;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface PageSchemaRepositoryContract {
  readonly defineSchema: (
    pageId: string,
    properties: readonly SchemaPropertyDefinition[],
    views: readonly SchemaViewDefinition[],
  ) => Promise<PageSchemaDefinition>;
  /**
   * La forma y las filas en el mismo movimiento: tocar una opción sin reescribir
   * lo que las filas guardaron bajo el nombre viejo las dejaría a todas fuera de
   * su columna.
   */
  readonly rewriteOption: (
    pageId: string,
    propertyKey: string,
    rename: { readonly from: string; readonly to: null | string },
    properties: readonly SchemaPropertyDefinition[],
  ) => Promise<PageSchemaDefinition | typeof SCHEMA_OPTION_ALREADY_MOVED>;
  /** Solo esa vista, sin tocar la forma de la colección ni las otras vistas. */
  readonly setViewConfiguration: (
    pageId: string,
    viewName: string,
    configuration: Prisma.InputJsonObject,
  ) => Promise<PageSchemaDefinition>;
  readonly getSchema: (pageId: string) => Promise<PageSchemaDefinition>;
  readonly resolveSchemaProperties: (pageId: null | string) => Promise<readonly SchemaPropertyDefinition[]>;
  readonly listRows: (pageId: string, workspaceId: string, userId: string, role: UserRole) => Promise<PageRowsPage>;
  readonly listWorkspaceMemberIds: (workspaceId: string) => Promise<readonly string[]>;
}
