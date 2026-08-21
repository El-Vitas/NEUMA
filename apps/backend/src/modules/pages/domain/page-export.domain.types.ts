/** The little a page has to say about itself for an export to know where it goes. */
export interface ExportablePage {
  readonly id: string;
  readonly order: number;
  readonly parentId: null | string;
  readonly title: string;
}

/** How much is being asked for: one page, a page with everything under it, or a whole space. */
export type PageExportScope =
  | { readonly kind: 'branch'; readonly pageId: string }
  | { readonly kind: 'page'; readonly pageId: string }
  | { readonly kind: 'space' };

export type OrderedExportPage<T extends ExportablePage> = T & { readonly path: readonly string[] };
