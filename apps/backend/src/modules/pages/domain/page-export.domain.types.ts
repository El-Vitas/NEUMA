export interface ExportablePage {
  readonly id: string;
  readonly order: number;
  readonly parentId: null | string;
  readonly title: string;
}

export type PageExportScope =
  | { readonly kind: 'branch'; readonly pageId: string }
  | { readonly kind: 'page'; readonly pageId: string }
  | { readonly kind: 'pages'; readonly pageIds: readonly string[] }
  | { readonly kind: 'space' };

export type OrderedExportPage<T extends ExportablePage> = T & { readonly path: readonly string[] };
