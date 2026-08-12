import type { Attrs, Fragment, NodeRange } from 'prosemirror-model';

/**
 * How a target type is rebuilt from the lines of text taken out of the blocks
 * being converted: one block per line, one block holding every line, or a list
 * with one item per line.
 */
export type PageEditorBlockShape =
  | { readonly attrs?: Attrs; readonly kind: 'textblock'; readonly type: string }
  | { readonly kind: 'holder'; readonly type: string }
  | { readonly itemType: string; readonly kind: 'list'; readonly type: string };

/** A type a block can be turned into, declared once for the menu and the command. */
export interface PageEditorBlockTarget {
  readonly id: string;
  readonly labelKey: string;
  readonly shape: PageEditorBlockShape;
}

/** A conversion the current selection can actually go through, and what it costs. */
export interface PageEditorBlockConversion {
  readonly id: string;
  readonly labelKey: string;
  readonly losesContent: boolean;
}

/** A conversion asked for, held back until it is confirmed when it would leave something behind. */
export interface PageEditorConversionRequest {
  readonly ask: (conversion: PageEditorBlockConversion) => void;
  readonly confirm: (targetId: string) => void;
  readonly dismiss: () => void;
  readonly pending: PageEditorBlockConversion | null;
}

/** The blocks a conversion applies to, read out as lines of text. */
export interface PageEditorConversionSource {
  readonly keepsEverything: boolean;
  readonly lines: readonly Fragment[];
  readonly range: NodeRange;
}

/** The lines of text read out of a block, and whether reading them left anything behind. */
export interface PageEditorBlockLines {
  readonly keepsEverything: boolean;
  readonly lines: readonly Fragment[];
}
