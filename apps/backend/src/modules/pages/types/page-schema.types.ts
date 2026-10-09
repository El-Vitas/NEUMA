import type { PageLifecycle } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import type { UserRole } from '@company-brain/shared';
import type {
  SchemaPropertyDefinition,
  SchemaPropertyValues,
  SchemaViewDefinition,
} from '../../../common/domain/schema.domain.types';
import type { SCHEMA_CHANGED_MEANWHILE, SCHEMA_OPTION_ALREADY_MOVED } from '../constants/pages.constants';

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

/** Las columnas y las vistas de una colección, como se leen y se guardan. */
export interface PageSchemaShape {
  readonly properties: readonly SchemaPropertyDefinition[];
  readonly views: readonly SchemaViewDefinition[];
}

export interface DefinePageSchemaInput {
  readonly pageId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: UserRole;
  readonly properties: readonly SchemaPropertyDefinition[];
  readonly views: readonly SchemaViewDefinition[];
  /**
   * La forma que leyó quien guarda, si la escribió a partir de ella: si ya no
   * es la de ahora, no se guarda, para no borrar lo que otra persona cambió.
   */
  readonly readShape?: PageSchemaShape;
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

/**
 * Qué filas de una colección se piden: las que deja ver una de sus vistas, o
 * las que deja ver un filtro y un orden propios. Sin ninguno de los dos, todas.
 */
export interface QueryPageRowsInput {
  /** Filtro y orden propios, con la forma de la configuración de una vista. */
  readonly configuration: unknown;
  readonly pageId: string;
  readonly role: UserRole;
  readonly userId: string;
  readonly viewName: string | null;
  readonly workspaceId: string;
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
  /** Si llega la forma que se leyó, solo guarda si sigue siendo la de ahora. */
  readonly defineSchema: (
    pageId: string,
    shape: PageSchemaShape,
    readShape?: PageSchemaShape,
  ) => Promise<PageSchemaDefinition | typeof SCHEMA_CHANGED_MEANWHILE>;
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
  /** Las columnas de personas de varias colecciones a la vez, por colección: una sola consulta para todas. */
  readonly listPersonPropertyKeys: (pageIds: readonly string[]) => Promise<ReadonlyMap<string, readonly string[]>>;
  /** Las filas de una colección en su orden, hasta el tope pedido, diciendo si quedaron más. */
  readonly listRows: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
    limit: number,
  ) => Promise<PageRowsPage>;
  readonly listWorkspaceMemberIds: (workspaceId: string) => Promise<readonly string[]>;
}
