import type { PageBlockColor, PageContent, PageMark, Result, UserRole } from '@neuma/shared';
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

export interface McpIconPack {
  readonly aliases?: Readonly<Record<string, unknown>>;
  readonly icons: Readonly<Record<string, unknown>>;
  readonly prefix: string;
}

export interface McpDrawing {
  readonly block: number;
  readonly kind: (typeof MCP_DRAWING_KINDS)[keyof typeof MCP_DRAWING_KINDS];
  readonly source: string;
}

export interface McpArchitectureMember {
  readonly indent: number;
  readonly isGroup: boolean;
  readonly name: string;
  readonly parent: string | null;
}

export interface McpDiagramMainThread {
  readonly listen: (type: 'message', listener: (event: MessageEvent<McpDiagramCheckRequest>) => void) => void;
  readonly reply: (message: unknown) => void;
}

export interface McpDiagramCheckRequest {
  readonly id: number;
  readonly source: string;
}

export type McpDiagramCheckAnswer = z.infer<typeof diagramCheckAnswerSchema>;

export interface McpPendingDiagramCheck {
  readonly fail: (error: Error) => void;
  readonly settle: (answer: McpDiagramCheckAnswer) => void;
}

/** Uses the portal's Mermaid for diagrams and KaTeX for formulas; failures carry the parser's own reason. */
export interface McpDrawingValidator {
  readonly checkDiagram: (source: string) => Promise<Result<string, string>>;
  readonly checkFormula: (latex: string, isOnItsOwnLine: boolean) => Result<string, string>;
}

/** Lower score is a better match. */
export interface McpRankedIcon {
  readonly matchedWords: number;
  readonly name: string;
  readonly rank: number;
}

export type McpSearchDiagramIconsOutput = z.infer<typeof searchDiagramIconsOutputSchema>;

export type McpBlockPlaceInput = Pick<McpInsertBlocksInput, 'after' | 'at' | 'before' | 'inside'>;

export type McpListBlockInput = Extract<McpBlockInput, { type: 'bullet_list' | 'ordered_list' }>;
export type McpTableBlockInput = Extract<McpBlockInput, { type: 'table' }>;
export type McpTaskListBlockInput = Extract<McpBlockInput, { type: 'task_list' }>;
export type McpCollectionBlockInput = Extract<McpBlockInput, { type: 'collection' }>;
export type McpButtonBlockInput = Extract<McpBlockInput, { type: 'button' }>;
export type McpColumnsBlockInput = Extract<McpBlockInput, { type: 'columns' }>;
export type McpBookmarkBlockInput = Extract<McpBlockInput, { type: 'bookmark' }>;
export type McpSyncedBlockInput = Extract<McpBlockInput, { type: 'synced' }>;

export type McpBuiltNode = Readonly<Record<string, unknown>>;

/** Row and column are 1-based; the header is row 1. */
export interface McpTableCellChange {
  readonly column: number;
  readonly paragraph: unknown;
  readonly row: number;
}

export interface McpTableChange {
  readonly addRows?: readonly (readonly unknown[])[];
  readonly cells?: readonly McpTableCellChange[];
  readonly deleteRows?: readonly number[];
}

export interface McpTextNode {
  readonly marks?: readonly PageMark[];
  readonly text: string;
  readonly type: 'text';
}

export interface McpBlockColors {
  readonly backgroundColor?: PageBlockColor | null;
  readonly textColor?: PageBlockColor | null;
}

export interface McpBlockChange {
  readonly checked?: boolean;
  readonly colors?: McpBlockColors;
  readonly replacement?: unknown;
  readonly summary?: string;
  readonly words?: {
    readonly inline: readonly unknown[];
    readonly paragraphs: readonly unknown[];
    readonly text: string;
  };
}

export interface McpPreparedBlocks {
  readonly blockIds: readonly string[];
  readonly content: PageContent;
  readonly nodes: readonly unknown[];
}

export interface McpContentWriter {
  readonly pageId: string;
  readonly role: UserRole;
  readonly spaceId: string;
  readonly userId: string;
  readonly workspaceId: string;
}

export type McpContentEdit = (current: PageContent) => Result<PageContent, string>;

/** Goes through the portal's live document so open viewers see the change at once. */
export interface McpContentEditor {
  readonly edit: (writer: McpContentWriter, edit: McpContentEdit) => Promise<Result<PageContent, McpRefusal>>;
}
