import type { AttributeSpec, DOMOutputSpec, Node as EditorNode, TagParseRule } from 'prosemirror-model';

/** Only what is specific to a block type; the shared id handling is added by `definePageBlock`. */
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
  readonly tableRole?: 'table' | 'row' | 'cell' | 'header_cell';
  readonly render: (node: EditorNode, blockAttributes: Record<string, string>) => DOMOutputSpec;
}
