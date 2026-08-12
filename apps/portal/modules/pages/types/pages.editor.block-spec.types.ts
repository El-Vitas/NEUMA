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
  readonly marks?: string;
  readonly parseDOM: readonly TagParseRule[];
  readonly render: (node: EditorNode, blockAttributes: Record<string, string>) => DOMOutputSpec;
}
