import type { Prisma } from '@company-brain/db/generated';
import type {
  AccessTokenPlace,
  PagePropertyOption,
  PagePropertyType,
  PagePropertyValues,
  PageViewType,
  Result,
  UserRole,
} from '@company-brain/shared';
import type { z } from 'zod';
import type {
  collectionOutputSchema,
  createCollectionInputSchema,
  createRowInputSchema,
  createViewInputSchema,
  deleteViewInputSchema,
  queryCollectionInputSchema,
  queryCollectionOutputSchema,
  rowOutputSchema,
  updateCollectionColumnsInputSchema,
  updateRowInputSchema,
  updateViewInputSchema,
} from '../schemas/mcp.collections.schemas';

export type McpCreateCollectionInput = z.infer<typeof createCollectionInputSchema>;
export type McpQueryCollectionInput = z.infer<typeof queryCollectionInputSchema>;
export type McpCreateRowInput = z.infer<typeof createRowInputSchema>;
export type McpUpdateRowInput = z.infer<typeof updateRowInputSchema>;
export type McpUpdateCollectionColumnsInput = z.infer<typeof updateCollectionColumnsInputSchema>;
export type McpCreateViewInput = z.infer<typeof createViewInputSchema>;
export type McpUpdateViewInput = z.infer<typeof updateViewInputSchema>;
export type McpDeleteViewInput = z.infer<typeof deleteViewInputSchema>;
export type McpCollectionOutput = z.infer<typeof collectionOutputSchema>;
export type McpQueryCollectionOutput = z.infer<typeof queryCollectionOutputSchema>;
export type McpRowOutput = z.infer<typeof rowOutputSchema>;

/** Lo que el agente pone en una celda: texto, un número, sí o no, varios valores, o nada. */
export type McpCellInput = string | number | boolean | readonly string[] | null;

/**
 * Cómo se nombran, en un rechazo, las columnas, opciones o vistas que sí hay:
 * todas, para que el agente corrija, o ninguna, para un token que puede
 * cambiar la colección pero no leerla.
 */
export type McpNameLister = (names: readonly string[]) => string | null;

/** Un paso sobre las columnas de una colección: parte de las que dejó el anterior. */
export type McpColumnStep = (
  columns: readonly McpColumn[],
  changes: McpColumnChanges,
  listNames: McpNameLister,
) => Result<McpColumn[], string>;

/** Las columnas de una colección, y cómo se nombran en un rechazo. */
export interface McpColumnsInHand {
  readonly columns: readonly McpColumn[];
  readonly listNames: McpNameLister;
}

/** Lo que se guarda en una celda. */
export type McpCellValue = string | number | boolean | string[] | null;

/** Lo que el agente pide que muestre una vista o una consulta, con las columnas nombradas como las ve la gente. */
export type McpViewShapeInput = Partial<Pick<McpCreateViewInput, 'groupBy' | 'sort' | 'visibleColumns' | 'where'>>;

/** Una opción que cambia de nombre, o se quita cuando no tiene nombre nuevo: reescribe las filas que la tenían. */
export interface McpOptionRewrite {
  readonly from: string;
  readonly propertyKey: string;
  readonly to: string | null;
}

/** Lo que el agente pide cambiar en las columnas de una colección, cada una nombrada como la ve la gente. */
export type McpColumnChanges = Omit<McpUpdateCollectionColumnsInput, 'collection'>;

/** Las columnas como quedan, y las opciones que hay que reescribir en las filas. */
export interface McpColumnChangesPlan {
  readonly optionRewrites: readonly McpOptionRewrite[];
  readonly properties: readonly McpColumn[];
}

/** Por qué un servicio no hizo lo que se le pidió: un código, y lo que explica el porqué. */
export interface McpRefusal {
  readonly code: string;
  readonly details: unknown;
}

/** Una columna de una colección, lo que hace falta para nombrar un valor. */
export interface McpSchemaColumn {
  readonly key: string;
  readonly label: string;
  readonly type: string;
}

/** Una columna de una colección, entera: lo que acepta y si hace falta. */
export interface McpColumn extends McpSchemaColumn {
  readonly options: readonly PagePropertyOption[] | null;
  readonly required: boolean;
  readonly type: PagePropertyType;
}

export interface McpView {
  readonly configuration: Prisma.InputJsonObject;
  readonly isDefault: boolean;
  readonly name: string;
  readonly type: PageViewType;
}

/** La forma de una colección: sus columnas y sus vistas. */
export interface McpCollectionShape {
  readonly properties: readonly McpColumn[];
  readonly views: readonly McpView[];
}

/** Una colección que el agente abrió: dónde está, cómo se llama y su forma. */
export interface McpOpenCollection {
  readonly id: string;
  /** Cómo se nombran sus columnas, opciones y vistas en un rechazo, según lo que el token lee. */
  readonly listNames: McpNameLister;
  /** Dónde está hoy, con sus ancestros: de ahí cuelgan sus filas. */
  readonly place: AccessTokenPlace;
  readonly shape: McpCollectionShape;
  readonly spaceId: string;
  readonly title: string;
}

export interface McpRow {
  readonly id: string;
  readonly order: number;
  readonly propertyValues: PagePropertyValues | null;
  readonly spaceId: string;
  readonly title: string;
}

/** Quién pide, para que el servicio decida con las mismas reglas que para una persona. */
export interface McpActor {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

/**
 * Las colecciones por el mismo servicio que usa el portal: las mismas
 * validaciones, las mismas reglas de acceso y los mismos candados.
 */
export interface McpCollectionService {
  /** Si llega la forma que se leyó, solo guarda si sigue siendo la de ahora. */
  readonly defineSchema: (
    input: McpActor & McpCollectionShape & { readonly pageId: string; readonly readShape?: McpCollectionShape },
  ) => Promise<Result<McpCollectionShape, McpRefusal>>;
  readonly getSchema: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<Result<McpCollectionShape, McpRefusal>>;
  readonly queryRows: (
    input: McpActor & { readonly configuration: unknown; readonly pageId: string; readonly viewName: string | null },
  ) => Promise<Result<{ readonly hasMore: boolean; readonly rows: readonly McpRow[] }, McpRefusal>>;
  readonly rewriteOption: (
    input: McpActor & {
      readonly from: string;
      readonly pageId: string;
      readonly propertyKey: string;
      readonly to: string | null;
    },
  ) => Promise<Result<McpCollectionShape, McpRefusal>>;
  readonly setViewConfiguration: (
    input: McpActor & {
      readonly configuration: Prisma.InputJsonObject;
      readonly pageId: string;
      readonly viewName: string;
    },
  ) => Promise<Result<McpCollectionShape, McpRefusal>>;
}

/** Una fila como quedó guardada después de escribirla. */
export interface McpWrittenRow {
  readonly id: string;
  readonly propertyValues: PagePropertyValues | null;
  readonly spaceId: string;
  readonly title: string;
}

/** Lo que el agente puede escribir en una fila: crearla, renombrarla y cambiar sus propiedades. */
export interface McpRowWriter {
  /** Crea la página a nombre de quien escribe: es su autor. */
  readonly create: (
    input: McpActor & {
      readonly content: Prisma.InputJsonValue;
      /** Nada cuando la página va arriba del todo en su espacio. */
      readonly parentId: string | null;
      readonly propertyValues: PagePropertyValues | null;
      readonly spaceId: string;
      readonly title: string;
    },
  ) => Promise<Result<McpWrittenRow, McpRefusal>>;
  /** En el orden del servicio de páginas: quien pide va antes que su espacio de trabajo. */
  readonly rename: (
    pageId: string,
    title: string,
    userId: string,
    workspaceId: string,
    role: UserRole,
  ) => Promise<Result<McpWrittenRow, McpRefusal>>;
  readonly updateProperties: (
    input: McpActor & {
      readonly pageId: string;
      readonly propertyValues: Readonly<Record<string, unknown>>;
      /** Un nombre nuevo, guardado en la misma escritura que las propiedades. */
      readonly title?: string;
      readonly updatedById: string;
    },
  ) => Promise<Result<McpWrittenRow, McpRefusal>>;
}
