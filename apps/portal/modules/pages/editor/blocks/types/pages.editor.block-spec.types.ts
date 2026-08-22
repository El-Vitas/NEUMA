import type { AttributeSpec, DOMOutputSpec, Node as EditorNode, TagParseRule } from 'prosemirror-model';

/**
 * What a block type declares of its own. Everything every block shares — the
 * id it carries, how that id reaches the page and how it is read back — is
 * added by `definePageBlock`, so it is written once for all of them.
 */
export interface PageBlockDefinition {
  readonly attrs?: Readonly<Record<string, AttributeSpec>>;
  readonly atom?: boolean;
  readonly code?: boolean;
  readonly content?: string;
  readonly defining?: boolean;
  readonly group?: string;
  readonly isolating?: boolean;
  readonly marks?: string;
  readonly parseDOM: readonly TagParseRule[];
  /** What part of a table this block plays, which is how a table knows its own shape. */
  readonly tableRole?: 'table' | 'row' | 'cell' | 'header_cell';
  readonly render: (node: EditorNode, blockAttributes: Record<string, string>) => DOMOutputSpec;
}
