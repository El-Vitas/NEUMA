import type { Attrs, Fragment, NodeRange } from 'prosemirror-model';

/** How a target is rebuilt from the extracted lines: a block per line, one holder for all, or a list item per line. */
export type PageEditorBlockShape =
  | { readonly attrs?: Attrs; readonly kind: 'textblock'; readonly type: string }
  | { readonly kind: 'holder'; readonly type: string }
  | { readonly itemType: string; readonly kind: 'list'; readonly type: string };

export interface PageEditorBlockTarget {
  readonly id: string;
  readonly labelKey: string;
  readonly shape: PageEditorBlockShape;
}

export interface PageEditorBlockConversion {
  readonly id: string;
  readonly labelKey: string;
  readonly losesContent: boolean;
}

/** `pending` holds a lossy conversion until it is confirmed. */
export interface PageEditorConversionRequest {
  readonly ask: (conversion: PageEditorBlockConversion) => void;
  readonly confirm: (targetId: string) => void;
  readonly dismiss: () => void;
  readonly pending: PageEditorBlockConversion | null;
}

export interface PageEditorConversionSource {
  readonly carried: Attrs;
  readonly keepsEverything: boolean;
  readonly lines: readonly Fragment[];
  readonly range: NodeRange;
}

export interface PageEditorBlockLines {
  readonly keepsEverything: boolean;
  readonly lines: readonly Fragment[];
}
