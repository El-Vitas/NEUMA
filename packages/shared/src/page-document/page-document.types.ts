import type { PageContentJson, PageMark } from '../schemas/page-content.schema.js';

/** Read by shape, not by type name, so an unknown block is still readable. */
export interface PageDocumentNodeShape {
  readonly attrs?: { readonly [key: string]: PageContentJson };
  readonly content?: readonly unknown[];
  readonly marks?: readonly PageMark[];
  readonly text?: string;
  readonly type: string;
}

/** Without a default, the attribute is required. */
export interface PageDocumentAttributeStructure {
  readonly default?: unknown;
}

export type PageDocumentAttributes = Readonly<Record<string, PageDocumentAttributeStructure>>;

/** Document shape only; rendering and editing behavior belong to the editor. */
export interface PageDocumentNodeStructure {
  readonly attrs?: PageDocumentAttributes;
  readonly content?: string;
  readonly group?: string;
  readonly inline?: boolean;
  readonly marks?: string;
}

export type PageBlockPlace =
  | { readonly at: 'end' | 'start' }
  | { readonly after: string }
  | { readonly before: string }
  | { readonly at: 'end' | 'start'; readonly inside: string };

export interface PageDocumentMarkStructure {
  readonly attrs?: PageDocumentAttributes;
  readonly inclusive?: boolean;
}
