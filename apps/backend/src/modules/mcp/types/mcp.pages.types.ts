import type { PageBlockColor, PageContent, PageMark, Result, UserRole } from '@company-brain/shared';
import type { z } from 'zod';
import type { MCP_DRAWING_KINDS } from '../constants/mcp.constants';
import type {
  blockInputSchema,
  commentedBlockOutputSchema,
  commentOnBlockInputSchema,
  createdPageOutputSchema,
  createPageInputSchema,
  deleteBlocksInputSchema,
  deleteCommentInputSchema,
  diagramCheckAnswerSchema,
  insertBlocksInputSchema,
  moveBlocksInputSchema,
  searchDiagramIconsInputSchema,
  searchDiagramIconsOutputSchema,
  updateBlockInputSchema,
  updateTableInputSchema,
  writtenBlocksOutputSchema,
} from '../schemas/mcp.pages.schemas';
import type { McpRefusal } from './mcp.collections.types';

export type McpBlockInput = z.infer<typeof blockInputSchema>;
export type McpCreatePageInput = z.infer<typeof createPageInputSchema>;
export type McpInsertBlocksInput = z.infer<typeof insertBlocksInputSchema>;
export type McpUpdateBlockInput = z.infer<typeof updateBlockInputSchema>;
export type McpDeleteBlocksInput = z.infer<typeof deleteBlocksInputSchema>;
export type McpMoveBlocksInput = z.infer<typeof moveBlocksInputSchema>;
export type McpWrittenBlocksOutput = z.infer<typeof writtenBlocksOutputSchema>;
export type McpCreatedPageOutput = z.infer<typeof createdPageOutputSchema>;
export type McpCommentOnBlockInput = z.infer<typeof commentOnBlockInputSchema>;
export type McpUpdateTableInput = z.infer<typeof updateTableInputSchema>;
export type McpDeleteCommentInput = z.infer<typeof deleteCommentInputSchema>;
export type McpCommentedBlockOutput = z.infer<typeof commentedBlockOutputSchema>;

/** Un paquete de íconos que los diagramas pueden nombrar: su prefijo y los nombres de sus íconos. */
export interface McpIconPack {
  readonly aliases?: Readonly<Record<string, unknown>>;
  readonly icons: Readonly<Record<string, unknown>>;
  readonly prefix: string;
}

/** Algo que la página dibuja a partir de lo escrito, en qué bloque está (contando desde uno) y qué dice. */
export interface McpDrawing {
  readonly block: number;
  readonly kind: (typeof MCP_DRAWING_KINDS)[keyof typeof MCP_DRAWING_KINDS];
  readonly source: string;
}

/** Algo puesto en un diagrama de arquitectura: un grupo, un servicio o un cruce, con su sangría y el grupo que lo contiene. */
export interface McpArchitectureMember {
  readonly indent: number;
  readonly isGroup: boolean;
  readonly name: string;
  readonly parent: string | null;
}

/** Cómo el worker que revisa diagramas escucha y contesta al proceso que lo creó. */
export interface McpDiagramMainThread {
  readonly listen: (type: 'message', listener: (event: MessageEvent<McpDiagramCheckRequest>) => void) => void;
  readonly reply: (message: unknown) => void;
}

/** Lo que se le pide al worker que revisa diagramas: un diagrama, con un número para reconocer su respuesta. */
export interface McpDiagramCheckRequest {
  readonly id: number;
  readonly source: string;
}

/** Lo que contesta: qué tipo de diagrama es, o por qué no se puede leer. */
export type McpDiagramCheckAnswer = z.infer<typeof diagramCheckAnswerSchema>;

/** Una revisión que espera su respuesta. */
export interface McpPendingDiagramCheck {
  readonly fail: (error: Error) => void;
  readonly settle: (answer: McpDiagramCheckAnswer) => void;
}

/**
 * Quien revisa, antes de guardar, que lo que se dibuja se pueda dibujar: un
 * diagrama con el mismo Mermaid que usa el portal, una fórmula con KaTeX. Si
 * no se puede, dice por qué con las palabras de quien la leyó.
 */
export interface McpDrawingValidator {
  readonly checkDiagram: (source: string) => Promise<Result<string, string>>;
  readonly checkFormula: (latex: string, isOnItsOwnLine: boolean) => Result<string, string>;
}

/** Un ícono encontrado, y qué tan bien responde a lo buscado: menos es mejor. */
export interface McpRankedIcon {
  readonly matchedWords: number;
  readonly name: string;
  readonly rank: number;
}

export type McpSearchDiagramIconsInput = z.infer<typeof searchDiagramIconsInputSchema>;
export type McpSearchDiagramIconsOutput = z.infer<typeof searchDiagramIconsOutputSchema>;

/** Dónde van unos bloques, como lo pide el agente. */
export type McpBlockPlaceInput = Pick<McpInsertBlocksInput, 'after' | 'at' | 'before' | 'inside'>;

export type McpListBlockInput = Extract<McpBlockInput, { type: 'bullet_list' | 'ordered_list' }>;
export type McpTableBlockInput = Extract<McpBlockInput, { type: 'table' }>;
export type McpTaskListBlockInput = Extract<McpBlockInput, { type: 'task_list' }>;
export type McpCollectionBlockInput = Extract<McpBlockInput, { type: 'collection' }>;
export type McpButtonBlockInput = Extract<McpBlockInput, { type: 'button' }>;
export type McpColumnsBlockInput = Extract<McpBlockInput, { type: 'columns' }>;
export type McpBookmarkBlockInput = Extract<McpBlockInput, { type: 'bookmark' }>;
export type McpSyncedBlockInput = Extract<McpBlockInput, { type: 'synced' }>;

/** Un nodo de una página recién armado a partir de lo que escribió el agente. */
export type McpBuiltNode = Readonly<Record<string, unknown>>;

/** Una celda que cambia: en qué fila y columna, contando desde uno con los encabezados como fila 1, y su párrafo nuevo. */
export interface McpTableCellChange {
  readonly column: number;
  readonly paragraph: unknown;
  readonly row: number;
}

/** Lo que cambia en una tabla: unas celdas, filas nuevas al final (una lista de párrafos cada una) y filas que se van. */
export interface McpTableChange {
  readonly addRows?: readonly (readonly unknown[])[];
  readonly cells?: readonly McpTableCellChange[];
  readonly deleteRows?: readonly number[];
}

/** Un trozo de texto de una línea, con lo que lleva puesto. */
export interface McpTextNode {
  readonly marks?: readonly PageMark[];
  readonly text: string;
  readonly type: 'text';
}

/** Los colores con que se pinta un bloque entero: uno de los de la página, o `null` para quitarlo. */
export interface McpBlockColors {
  readonly backgroundColor?: PageBlockColor | null;
  readonly textColor?: PageBlockColor | null;
}

/** Lo que cambia en un bloque: palabras nuevas de su mismo tipo, si está marcado, o un bloque entero en su lugar. */
export interface McpBlockChange {
  readonly checked?: boolean;
  readonly colors?: McpBlockColors;
  readonly replacement?: unknown;
  readonly words?: { readonly inline: readonly unknown[]; readonly text: string };
}

/** Unos bloques listos para una página, el id que quedó en cada uno de los de arriba, y una página que solo los tiene a ellos. */
export interface McpPreparedBlocks {
  readonly blockIds: readonly string[];
  readonly content: PageContent;
  readonly nodes: readonly unknown[];
}

/** Quién escribe en qué página, ya en el espacio donde está hoy. */
export interface McpContentWriter {
  readonly pageId: string;
  readonly role: UserRole;
  readonly spaceId: string;
  readonly userId: string;
  readonly workspaceId: string;
}

/** Un cambio sobre lo que la página dice al escribir: la página que queda, o por qué no se puede. */
export type McpContentEdit = (current: PageContent) => Result<PageContent, string>;

/**
 * Escribir en una página por el mismo camino que usa el portal: el documento
 * en vivo, así quien la tiene abierta lo ve al momento.
 */
export interface McpContentEditor {
  readonly edit: (writer: McpContentWriter, edit: McpContentEdit) => Promise<Result<PageContent, McpRefusal>>;
}
